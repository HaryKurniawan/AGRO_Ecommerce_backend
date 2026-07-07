import { Injectable, BadRequestException, Logger } from "@nestjs/common";

import { ProdukEcomsRepository } from "../../ecom-produk/repositories/ecom-produks.repository";
import { PesananEcomsRepository } from "../repositories/ecom-pesanans.repository";
import { ProfitReportService } from "../../profit-report/profit-report.service";
import { NotificationsService } from "../../../core/notifikasi/notifikasis.service";
import { XenditService } from "../services/xendit.service";
import { PrismaService } from "../../../infrastructure/database/prisma.service";

import type {
  CreateOrderItemInput,
  CreateOrderStoreInput,
  CreateOrderInput,
  XenditItemLine,
} from "./create-pesanan.types";

// ────────────────────────────────────────────────────────────
// Re-export agar controller / modul tidak perlu import ganda
// ────────────────────────────────────────────────────────────
export { CreateOrderInput, CreateOrderStoreInput, CreateOrderItemInput };

@Injectable()
export class CreateOrderHelpersService {
  private readonly logger = new Logger(CreateOrderHelpersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly productsRepo: ProdukEcomsRepository,
    private readonly ordersRepo: PesananEcomsRepository,
    private readonly profitReportService: ProfitReportService,
    private readonly notificationsService: NotificationsService,
    private readonly xenditService: XenditService,
  ) {}

  // ──────────────────────────────────────────────────────────
  // 1. Hitung harga & berat setiap item — cegah price manipulation
  // ──────────────────────────────────────────────────────────
  async calcItemPricesAndWeight(
    items: CreateOrderItemInput[],
  ): Promise<{ totalWeightGram: number; isB2B: boolean }> {
    let totalWeightGram = 0;

    for (const item of items) {
      const product = await this.productsRepo.findUnique({
        where: { id: item.produkId },
        select: { id: true, nama: true, beratGram: true, harga: true },
      });
      if (!product) {
        throw new BadRequestException(`Produk ${item.produkId} tidak ditemukan`);
      }

      let weightGram = product.beratGram || 1000;
      let calculatedPrice = product.harga;

      if (item.varianKemasanId) {
        const varian = await this.prisma.varianKemasan.findUnique({
          where: { id: item.varianKemasanId },
        });
        if (varian) {
          weightGram = varian.ukuranKg * 1000;
          calculatedPrice =
            product.harga * varian.ukuranKg + (varian.biayaTambahan || 0);
        }
      }

      // Anti-price-manipulation: overwrite dengan harga server
      item.harga = calculatedPrice;
      totalWeightGram += weightGram * item.jumlah;
    }

    const isB2B = totalWeightGram >= 300_000; // >= 300 kg
    return { totalWeightGram, isB2B };
  }

  // ──────────────────────────────────────────────────────────
  // 2. Validasi ketersediaan stok sebelum order dibuat
  // ──────────────────────────────────────────────────────────
  async validateStock(storeOrder: CreateOrderStoreInput): Promise<void> {
    for (const item of storeOrder.item) {
      if (item.varianKemasanId) {
        const varian = await this.prisma.varianKemasan.findUnique({
          where: { id: item.varianKemasanId },
        });
        if (!varian || !varian.isActive || varian.stokKemasan < item.jumlah) {
          throw new BadRequestException(
            `Stok kemasan untuk produk ${item.produkId} (${varian?.ukuranKg}kg) ` +
              `tidak mencukupi (Tersedia: ${varian?.stokKemasan || 0} unit)`,
          );
        }
      } else {
        const inventories = await this.productsRepo.findManyInventory({
          where: { tokoId: storeOrder.tokoId, produkId: item.produkId },
        });
        const totalAvailable = inventories.reduce(
          (sum, inv) => sum + inv.stokTersediaKg,
          0,
        );
        if (totalAvailable < item.jumlah) {
          throw new BadRequestException(
            `Stok Toko untuk produk ${item.produkId} tidak mencukupi ` +
              `(Tersedia: ${totalAvailable}kg)`,
          );
        }
      }
    }
  }

  // ──────────────────────────────────────────────────────────
  // 3. Kurangi stok & log riwayat setelah pesanan dibuat
  // ──────────────────────────────────────────────────────────
  async deductInventoryAndLog(
    storeOrder: CreateOrderStoreInput,
    pesananId: string,
    penggunaId: string,
  ): Promise<void> {
    for (const item of storeOrder.item) {
      let qtyToDeductKg = item.jumlah;

      // Kemasan: decrement stokKemasan, hitung konversi ke kg
      if (item.varianKemasanId) {
        const varian = await this.prisma.varianKemasan.update({
          where: { id: item.varianKemasanId },
          data: { stokKemasan: { decrement: item.jumlah } },
        });
        qtyToDeductKg = item.jumlah * (varian?.ukuranKg || 1.0);
      }

      // Kurangi inventory toko
      const inventories = await this.productsRepo.findManyInventory({
        where: { tokoId: storeOrder.tokoId, produkId: item.produkId },
        take: 1,
      });
      if (inventories[0]) {
        await this.productsRepo.updateInventory({
          where: { id: inventories[0].id },
          data: {
            stokTersediaKg: { decrement: qtyToDeductKg },
            stokFisikKg: { decrement: qtyToDeductKg },
          },
        });
      }

      // Sinkronisasi total stok produk
      const currentStok = await this.productsRepo
        .findUnique({ where: { id: item.produkId }, select: { stok: true } })
        .then((p) => p?.stok ?? 0);

      const finalStok = Math.max(0, currentStok - qtyToDeductKg);

      await this.productsRepo.update({
        where: { id: item.produkId },
        data: {
          stok: finalStok,
          status: finalStok === 0 ? "OUT_OF_STOCK" : undefined,
        },
      });

      // Catat riwayat stok
      await this.productsRepo.createStockHistory({
        data: {
          produkId: item.produkId,
          penggunaId, // diisi oleh caller
          tipe: "OUT",
          kuantitas: -Math.round(qtyToDeductKg),
          stokAkhir: Math.floor(finalStok),
          catatan: item.varianKemasanId
            ? `Penjualan Pesanan #${pesananId} (${item.jumlah} kemasan)`
            : `Penjualan Pesanan #${pesananId} (Unified Stock)`,
          pesananId,
        },
      });
    }
  }

  // ──────────────────────────────────────────────────────────
  // 4. Catat profit transactions FIFO (non-fatal)
  // ──────────────────────────────────────────────────────────
  async recordProfitTransactions(
    pesanan: any,
    tokoId: string,
    isB2B: boolean,
  ): Promise<void> {
    try {
      for (const itemPesanan of pesanan.item) {
        await this.profitReportService.createProfitTransaction({
          id: itemPesanan.id,
          pesananId: pesanan.id,
          produkId: itemPesanan.produkId,
          jumlah: itemPesanan.jumlah,
          harga: itemPesanan.harga,
          produk: { tokoId, hargaBeli: itemPesanan.produk.hargaBeli },
          pesanan: { status: pesanan.status },
          isB2B,
        });
      }
    } catch (err) {
      this.logger.error(`[Profit] Failed for pesanan ${pesanan.id}:`, err);
    }
  }

  // ──────────────────────────────────────────────────────────
  // 5. Kosongkan keranjang setelah semua pesanan berhasil dibuat
  // ──────────────────────────────────────────────────────────
  async clearCart(
    penggunaId: string,
    pesananList: CreateOrderStoreInput[],
  ): Promise<void> {
    const keranjang =
      await this.ordersRepo.findCartByCustomerId(penggunaId);
    if (!keranjang) return;

    for (const store of pesananList) {
      for (const item of store.item) {
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

  // ──────────────────────────────────────────────────────────
  // 6. Buat pembayaran Xendit (QRIS atau Invoice) lalu simpan ke DB
  // ──────────────────────────────────────────────────────────
  async processXenditPayment(
    createdOrders: any[],
    metodeBayar: string,
    konsumenData: { email?: string; nama?: string; noTelepon?: string } | null,
    mobileNumber?: string,
  ): Promise<void> {
    const grandTotal = createdOrders.reduce(
      (sum, o) => sum + (o.totalHarga || 0),
      0,
    );
    const externalId = createdOrders.map((o) => o.id).join("-");
    const isQRIS = metodeBayar.toUpperCase() === "QRIS";

    let finalPaymentId: string;
    let finalPaymentUrl: string;

    if (isQRIS) {
      // QRIS: Xendit QR Code API → qr_string EMVCo resmi
      const xenditQR = await this.xenditService.createQRIS({
        referenceId: externalId,
        amount: grandTotal,
      });
      finalPaymentId = xenditQR.id;
      finalPaymentUrl = xenditQR.qrString;
      this.logger.log(`[QRIS] Xendit QRIS created: ${externalId}`);
    } else {
      // Non-QRIS: Xendit Invoice API (VA Bank, DANA, OVO, GoPay, ShopeePay…)
      const xenditItems: XenditItemLine[] = [];
      for (const order of createdOrders) {
        for (const item of order.item) {
          xenditItems.push({
            name: item.produk?.nama?.substring(0, 256) || "Produk",
            quantity: item.jumlah,
            price: item.harga,
            category: "Produk Pertanian",
          });
        }
        if (order.ongkir > 0) {
          xenditItems.push({
            name: "Ongkos Kirim",
            quantity: 1,
            price: order.ongkir,
            category: "Pengiriman",
          });
        }
      }

      const invoice = await this.xenditService.createInvoice({
        externalId,
        amount: grandTotal,
        payerEmail: konsumenData?.email,
        customerName: konsumenData?.nama,
        customerPhone: konsumenData?.noTelepon || mobileNumber,
        items: xenditItems,
      });

      finalPaymentId = invoice.id;
      finalPaymentUrl = invoice.invoiceUrl;
    }

    // Simpan ke semua pesanan yang baru dibuat
    for (const order of createdOrders) {
      await this.prisma.pesananEcom.update({
        where: { id: order.id },
        data: { paymentId: finalPaymentId, paymentUrl: finalPaymentUrl },
      });
      order.paymentId = finalPaymentId;
      order.paymentUrl = finalPaymentUrl;
    }
  }

  // ──────────────────────────────────────────────────────────
  // 7. Jadwalkan auto-cancel setelah 24 jam (non-fatal)
  // ──────────────────────────────────────────────────────────
  async scheduleAutoCancels(orderIds: string[]): Promise<void> {
    for (const orderId of orderIds) {
      setTimeout(async () => {
        try {
          this.logger.debug(`Checking if order ${orderId} needs to be canceled...`);
          const order = await this.ordersRepo.findUnique({ where: { id: orderId } });
          if (!order) return;
          if (order.status === "MENUNGGU_BAYAR") {
            this.logger.log(`Auto-canceling unpaid order ${orderId}`);
            await this.prisma.pesananEcom.update({
              where: { id: orderId },
              data: { status: "DIBATALKAN" },
            });
            this.logger.log(`Successfully canceled order ${orderId}`);
          }
        } catch (err) {
          this.logger.error(`Failed auto-cancel order ${orderId}:`, err);
        }
      }, 24 * 60 * 60 * 1000); // 24 hours
    }
  }
}
