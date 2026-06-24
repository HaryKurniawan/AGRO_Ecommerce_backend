import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

import { PesananEcomsRepository } from "../repositories/ecom-pesanans.repository";
import { ProdukEcomsRepository } from "../../ecom-produk/repositories/ecom-produks.repository";
import { TokosRepository } from "../../toko/repositories/tokos.repository";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CalculateShippingCostsUseCase } from "../../../core/logistik/use-cases/calculate-shipping-costs.usecase";
import { NotificationsService } from "../../../core/notifikasi/notifikasis.service";
import { ProfitReportService } from "../../profit-report/profit-report.service";
import { MidtransService } from "../services/midtrans.service";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class CreateOrderUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersRepo: PesananEcomsRepository,
    private readonly productsRepo: ProdukEcomsRepository,
    private readonly tokosRepo: TokosRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly calcShippingUC: CalculateShippingCostsUseCase,
    private readonly notificationsService: NotificationsService,
    private readonly profitReportService: ProfitReportService,
    private readonly midtransService: MidtransService,
    @InjectQueue("order") private readonly orderQueue: Queue,
  ) {}

  async execute(
    penggunaId: string,
    data: {
      metodeBayar: string;
      alamatKirim: string;
      jadwalKirim?: string;
      mobileNumber?: string; // Khusus OVO
      pesanan: {
        tokoId: string;
        ongkir: number;
        catatan?: string;
        metodeKirim?: string;
        item: {
          produkId: string;
          jumlah: number;
          harga: number;
          varianKemasanId?: string;
        }[];
      }[];
    },
  ) {
    if (!data.pesanan || data.pesanan.length === 0) {
      throw new BadRequestException("Pesanan tidak boleh kosong");
    }

    const customerAddress = await this.prisma.alamatKonsumen.findUnique({
      where: { id: data.alamatKirim },
    });
    if (!customerAddress) {
      throw new BadRequestException("Alamat pengiriman tidak ditemukan");
    }

    const createdOrders: any[] = [];

    // RE-CALCULATE SHIPPING COSTS UNTUK ANTI-BYPASS
    await this.calcShippingUC.execute({
      customerAddressId: data.alamatKirim,
      toko: data.pesanan.map((p) => {
        // Estimate total weight here for the recalculation
        return {
          tokoId: p.tokoId,
          totalWeightGram: 1000, // We will recalculate this exactly below, but we need it here for accurate ongkir
        };
      }),
    });

    // Loop through each toko's pesanan
    for (const storeOrder of data.pesanan) {
      let totalWeightGram = 0;
      for (const item of storeOrder.item) {
        const product = await this.productsRepo.findUnique({
          where: { id: item.produkId },
          select: { id: true, nama: true, beratGram: true, harga: true },
        });

        if (!product) {
          throw new BadRequestException(
            `Produk ${item.produkId} tidak ditemukan`,
          );
        }

        let weightGram = product.beratGram || 1000;
        let calculatedPrice = product.harga;

        if (item.varianKemasanId) {
          const varian = await this.prisma.varianKemasan.findUnique({
            where: { id: item.varianKemasanId },
          });
          if (varian) {
            weightGram = varian.ukuranKg * 1000;
            // Dynamic Pricing Formula: (Base Price * Kg) + Extra Fee
            calculatedPrice = (product.harga * varian.ukuranKg) + (varian.biayaTambahan || 0);
          }
        }

        // Prevent price manipulation from frontend
        item.harga = calculatedPrice;

        totalWeightGram += weightGram * item.jumlah;
      }

      const isB2B = totalWeightGram >= 300000; // >= 300kg

      // Re-run calculateShippingCosts explicitly for this store with accurate weight
      const accurateShipping = await this.calcShippingUC.execute({
        customerAddressId: data.alamatKirim,
        toko: [{ tokoId: storeOrder.tokoId, totalWeightGram }],
      });

      const shippingDetail = accurateShipping.find(
        (s) => s.tokoId === storeOrder.tokoId,
      );
      if (!shippingDetail) {
        throw new BadRequestException(
          `Pengiriman dari toko ${storeOrder.tokoId} tidak ditemukan`,
        );
      }

      const chosenMethod = storeOrder.metodeKirim || "LOKAL";

      if (!shippingDetail.isAvailable) {
        throw new BadRequestException(
          `Metode pengiriman 'LOKAL' tidak tersedia untuk toko ${storeOrder.tokoId}: ${shippingDetail.keterangan}`,
        );
      }

      // Validasi Anti-Bypass Ongkir
      if (storeOrder.ongkir !== shippingDetail.ongkir) {
        throw new BadRequestException(
          `Manipulasi Ongkir Terdeteksi! Ongkir dari frontend: ${storeOrder.ongkir}, Ongkir valid sistem: ${shippingDetail.ongkir}`,
        );
      }

      // 2. Determine routing
      const diprosesOleh = "TOKO";
      const gudangId: string | undefined = undefined;

      // 3. Check and deduct inventory from Store Inventory (Only for Retail)
      if (!isB2B) {
        for (const item of storeOrder.item) {
          if (item.varianKemasanId) {
            const varian = await this.prisma.varianKemasan.findUnique({
              where: { id: item.varianKemasanId },
            });
            if (!varian || !varian.isActive || varian.stokKemasan < item.jumlah) {
              throw new BadRequestException(
                `Stok kemasan untuk produk ${item.produkId} (${varian?.ukuranKg}kg) tidak mencukupi (Tersedia: ${varian?.stokKemasan || 0} unit)`,
              );
            }
          } else {
            const productInventory = await this.productsRepo.findManyInventory({
              where: {
                tokoId: storeOrder.tokoId,
                produkId: item.produkId,
              },
            });

            const totalAvailableStock = productInventory.reduce(
              (sum, inv) => sum + inv.stokTersediaKg,
              0,
            );

            if (totalAvailableStock < item.jumlah) {
              throw new BadRequestException(
                `Stok Toko untuk produk ${item.produkId} tidak mencukupi (Tersedia: ${totalAvailableStock}kg)`,
              );
            }
          }
        }
      }

      const totalHargaItems = storeOrder.item.reduce(
        (sum, i) => sum + i.harga * i.jumlah,
        0,
      );

      // 4. Create PesananEcom
      const pesanan = await this.ordersRepo.create({
        data: {
          konsumenId: penggunaId,
          totalHarga: totalHargaItems + (storeOrder.ongkir || 0),
          ongkir: storeOrder.ongkir || 0,
          metodeBayar: data.metodeBayar,
          alamatKirim:
            `${customerAddress.alamat}, ${customerAddress.kecamatan || ""}, ${customerAddress.kota || ""}, ${customerAddress.provinsi || ""} ${customerAddress.kodePos || ""}`
              .replace(/,\s*,/g, ",")
              .replace(/\s+/g, " ")
              .replace(/, ,/g, ",")
              .trim(),
          jadwalKirim: data.jadwalKirim
            ? new Date(data.jadwalKirim)
            : undefined,
          jarakPengirimanKm: shippingDetail.distanceKm,
          isFallbackDistance: shippingDetail.isFallback,
          metodeKirim: chosenMethod,
          diprosesOleh,
          gudangId,
          tokoId: storeOrder.tokoId,
          catatan: storeOrder.catatan,
          item: {
            create: storeOrder.item.map((item) => ({
              produkId: item.produkId,
              jumlah: item.jumlah,
              harga: item.harga,
              varianKemasanId: item.varianKemasanId || null,
            })),
          },
        },
        include: { item: { include: { produk: true } } },
      });

      // 4.5. Create FIFO profit transactions for each item
      try {
        for (const itemPesanan of pesanan.item) {
          await this.profitReportService.createProfitTransaction({
            id: itemPesanan.id,
            pesananId: pesanan.id,
            produkId: itemPesanan.produkId,
            jumlah: itemPesanan.jumlah,
            harga: itemPesanan.harga,
            produk: { 
              tokoId: storeOrder.tokoId,
              hargaBeli: itemPesanan.produk.hargaBeli 
            },
            pesanan: { status: pesanan.status },
            isB2B: isB2B,
          });
        }
        console.log(
          `[CreateOrderUseCase] Created FIFO profit transactions for pesanan ${pesanan.id}`,
        );
      } catch (error) {
        console.error(
          `[CreateOrderUseCase] Error creating FIFO profit transactions:`,
          error,
        );
        // Don't fail the entire order if profit tracking fails
      }

      // Kirim Notifikasi Darurat ke Admin & Seller jika Fallback digunakan
      if (shippingDetail.isFallback) {
        await this.notificationsService.create(penggunaId, {
          judul: "Peringatan Jarak Pengiriman",
          pesan: `Pesanan ${pesanan.id} dihitung menggunakan estimasi jarak garis lurus karena server rute sedang sibuk. Selisih jarak dengan kurir mungkin terjadi.`,
          tipe: "SYSTEM_WARNING",
          data: { pesananId: pesanan.id },
        });
      }

      if (!isB2B) {
        for (const item of storeOrder.item) {
          let qtyToDeductKg = item.jumlah;

          if (item.varianKemasanId) {
            const varian = await this.prisma.varianKemasan.update({
              where: { id: item.varianKemasanId },
              data: {
                stokKemasan: { decrement: item.jumlah },
              },
            });
            qtyToDeductKg = item.jumlah * (varian?.ukuranKg || 1.0);
          }

          const inventories = await this.productsRepo.findManyInventory({
            where: {
              tokoId: storeOrder.tokoId,
              produkId: item.produkId,
            },
            take: 1,
          });
          const inventory = inventories[0];

          if (inventory) {
            await this.productsRepo.updateInventory({
              where: { id: inventory.id },
              data: {
                stokTersediaKg: { decrement: qtyToDeductKg },
                stokFisikKg: { decrement: qtyToDeductKg },
              },
            });
          }

          // Final sync for product total stock and status
          const totalStok = await this.productsRepo
            .findUnique({
              where: { id: item.produkId },
              select: { stok: true },
            })
            .then((p) => p?.stok ?? 0);

          const finalTotalStok = Math.max(0, totalStok - qtyToDeductKg);

          await this.productsRepo.update({
            where: { id: item.produkId },
            data: {
              stok: finalTotalStok,
              status: finalTotalStok === 0 ? "OUT_OF_STOCK" : undefined,
            },
          });

          // Log history (represented in total kg)
          await this.productsRepo.createStockHistory({
            data: {
              produkId: item.produkId,
              penggunaId,
              tipe: "OUT",
              kuantitas: -Math.round(qtyToDeductKg),
              stokAkhir: Math.floor(finalTotalStok),
              catatan: item.varianKemasanId
                ? `Penjualan Pesanan #${pesanan.id} (${item.jumlah} kemasan)`
                : `Penjualan Pesanan #${pesanan.id} (Unified Stock)`,
              pesananId: pesanan.id,
            },
          });
        }
      }

      createdOrders.push(pesanan);
    }

    // Clear keranjang after all pesanan created
    const keranjang = await this.ordersRepo.findCartByCustomerId(penggunaId);
    if (keranjang) {
      for (const order of data.pesanan) {
        for (const item of order.item) {
          await this.ordersRepo.deleteManyCartItems({
            where: {
              keranjangId: keranjang.id,
              produkId: item.produkId,
              varianKemasanId: item.varianKemasanId || null,
            },
          });
        }
      }
    }

    // Emit events for real-time SSE
    for (const order of createdOrders) {
      this.eventEmitter.emit("order.status.updated", {
        orderId: order.id,
        status: order.status,
        tokoId: order.tokoId,
      });
    }

    // ========== MIDTRANS PAYMENT GATEWAY ==========
    // SEMUA transaksi WAJIB menggunakan Payment Gateway Midtrans
    if (createdOrders.length > 0) {
      try {
        // Ambil data konsumen untuk email
        const konsumen = await this.prisma.pengguna.findUnique({
          where: { id: penggunaId },
          select: { nama: true, email: true, noTelepon: true },
        });

        // Total dari semua pesanan
        const grandTotal = createdOrders.reduce(
          (sum, o) => sum + (o.totalHarga || 0),
          0,
        );

        // External ID unik menggabungkan semua pesanan ID
        const externalId = createdOrders
          .map((o) => o.id)
          .join("-");

        // Format item details untuk Midtrans
        const itemDetails = [];
        for (const order of createdOrders) {
          for (const item of order.item) {
            itemDetails.push({
              id: item.produkId,
              price: item.harga,
              quantity: item.jumlah,
              name: item.produk?.nama?.substring(0, 50) || "Produk",
            });
          }
          if (order.ongkir > 0) {
            itemDetails.push({
              id: `ONGKIR-${order.id}`,
              price: order.ongkir,
              quantity: 1,
              name: "Ongkos Kirim",
            });
          }
        }

        const midtransTx = await this.midtransService.createTransaction({
          externalId,
          amount: grandTotal,
          payerEmail: konsumen?.email,
          customerName: konsumen?.nama,
          customerPhone: konsumen?.noTelepon || data.mobileNumber,
          itemDetails: itemDetails
        });

        const finalPaymentId = midtransTx.token;
        const finalPaymentUrl = midtransTx.redirectUrl;

        // Simpan paymentId dan paymentUrl ke semua pesanan
        for (const order of createdOrders) {
          await this.prisma.pesananEcom.update({
            where: { id: order.id },
            data: {
              paymentId: finalPaymentId,
              paymentUrl: finalPaymentUrl,
            },
          });
          // Update object in memory agar response ke frontend sudah update
          order.paymentId = finalPaymentId;
          order.paymentUrl = finalPaymentUrl;
        }
      } catch (midtransError) {
        // Jika Midtrans gagal, pesanan tetap tersimpan tapi tanpa link bayar
        // Log error tapi jangan batalkan pesanan
        console.error(
          "[CreateOrderUseCase] Midtrans creation failed:",
          midtransError?.message,
        );
      }
      
      // Jadwalkan auto-cancel order setelah 24 jam untuk semua pesanan yang dibuat
      for (const order of createdOrders) {
        try {
          await this.orderQueue.add(
            "cancelUnpaidOrder",
            { orderId: order.id },
            { delay: 24 * 60 * 60 * 1000 }, // 24 hours
          );
        } catch (err) {
          console.error(`Failed to schedule auto-cancel for order ${order.id}:`, err);
        }
      }
    }
    // ============================================

    return createdOrders;
  }
}
