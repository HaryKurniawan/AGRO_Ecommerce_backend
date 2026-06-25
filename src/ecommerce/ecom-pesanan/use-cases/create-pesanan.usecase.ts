import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CalculateShippingCostsUseCase } from "../../../core/logistik/use-cases/calculate-shipping-costs.usecase";
import { NotificationsService } from "../../../core/notifikasi/notifikasis.service";
import { PesananEcomsRepository } from "../repositories/ecom-pesanans.repository";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { CreateOrderHelpersService } from "./create-pesanan-helpers.service";

import type { CreateOrderInput } from "./create-pesanan.types";
export { CreateOrderInput } from "./create-pesanan.types";

/**
 * CreateOrderUseCase — Orchestrator
 *
 * File ini hanya mengatur alur tingkat tinggi.
 * Logika detail (kalkulasi harga, validasi stok, deduct inventory,
 * pembayaran Xendit, dsb.) didelegasikan ke CreateOrderHelpersService.
 */
@Injectable()
export class CreateOrderUseCase {
  private readonly logger = new Logger(CreateOrderUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersRepo: PesananEcomsRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly calcShippingUC: CalculateShippingCostsUseCase,
    private readonly notificationsService: NotificationsService,
    private readonly helpers: CreateOrderHelpersService,
  ) {}

  async execute(penggunaId: string, data: CreateOrderInput) {
    if (!data.pesanan?.length) {
      throw new BadRequestException("Pesanan tidak boleh kosong");
    }

    // ── 1. Validasi alamat pengiriman ──────────────────────
    const customerAddress = await this.prisma.alamatKonsumen.findUnique({
      where: { id: data.alamatKirim },
    });
    if (!customerAddress) {
      throw new BadRequestException("Alamat pengiriman tidak ditemukan");
    }

    const createdOrders: any[] = [];

    // ── 2. Pra-hitung ongkir (anti-bypass) ────────────────
    await this.calcShippingUC.execute({
      customerAddressId: data.alamatKirim,
      toko: data.pesanan.map((p) => ({ tokoId: p.tokoId, totalWeightGram: 1000 })),
    });

    // ── 3. Proses tiap toko ────────────────────────────────
    for (const storeOrder of data.pesanan) {
      // 3a. Hitung harga & berat; cegah price manipulation
      const { totalWeightGram, isB2B } =
        await this.helpers.calcItemPricesAndWeight(storeOrder.item);

      // 3b. Hitung ongkir akurat berdasarkan berat nyata
      const shippingResults = await this.calcShippingUC.execute({
        customerAddressId: data.alamatKirim,
        toko: [{ tokoId: storeOrder.tokoId, totalWeightGram }],
      });
      const shipping = shippingResults.find((s) => s.tokoId === storeOrder.tokoId);
      if (!shipping) {
        throw new BadRequestException(
          `Pengiriman dari toko ${storeOrder.tokoId} tidak ditemukan`,
        );
      }
      if (!shipping.isAvailable) {
        throw new BadRequestException(
          `Metode pengiriman tidak tersedia untuk toko ${storeOrder.tokoId}: ${shipping.keterangan}`,
        );
      }
      if (storeOrder.ongkir !== shipping.ongkir) {
        throw new BadRequestException(
          `Manipulasi Ongkir Terdeteksi! Frontend: ${storeOrder.ongkir}, Valid: ${shipping.ongkir}`,
        );
      }

      // 3c. Validasi stok (retail only)
      if (!isB2B) {
        await this.helpers.validateStock(storeOrder);
      }

      // 3d. Bangun alamat pengiriman yang bersih
      const alamatKirim = [
        customerAddress.alamat,
        customerAddress.kecamatan,
        customerAddress.kota,
        customerAddress.provinsi,
        customerAddress.kodePos,
      ]
        .filter(Boolean)
        .join(", ")
        .replace(/,\s*,/g, ",")
        .replace(/\s+/g, " ")
        .trim();

      const totalHargaItems = storeOrder.item.reduce(
        (sum, i) => sum + i.harga * i.jumlah,
        0,
      );

      // 3e. Buat PesananEcom di DB
      const pesanan = await this.ordersRepo.create({
        data: {
          konsumenId: penggunaId,
          totalHarga: totalHargaItems + (storeOrder.ongkir || 0),
          ongkir: storeOrder.ongkir || 0,
          metodeBayar: data.metodeBayar,
          alamatKirim,
          jadwalKirim: data.jadwalKirim ? new Date(data.jadwalKirim) : undefined,
          jarakPengirimanKm: shipping.distanceKm,
          isFallbackDistance: shipping.isFallback,
          metodeKirim: storeOrder.metodeKirim || "LOKAL",
          diprosesOleh: "TOKO",
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

      // 3f. Catat profit FIFO (non-fatal)
      await this.helpers.recordProfitTransactions(pesanan, storeOrder.tokoId, isB2B);

      // 3g. Notifikasi fallback jarak
      if (shipping.isFallback) {
        await this.notificationsService.create(penggunaId, {
          judul: "Peringatan Jarak Pengiriman",
          pesan: `Pesanan ${pesanan.id} menggunakan estimasi jarak garis lurus.`,
          tipe: "SYSTEM_WARNING",
          data: { pesananId: pesanan.id },
        });
      }

      // 3h. Kurangi stok & catat riwayat (retail only)
      if (!isB2B) {
        await this.helpers.deductInventoryAndLog(storeOrder, pesanan.id, penggunaId);
      }

      createdOrders.push(pesanan);
    }

    // ── 4. Kosongkan keranjang ─────────────────────────────
    await this.helpers.clearCart(penggunaId, data.pesanan);

    // ── 5. Emit SSE ke semua listener real-time ─────────────
    for (const order of createdOrders) {
      this.eventEmitter.emit("order.status.updated", {
        orderId: order.id,
        status: order.status,
        tokoId: order.tokoId,
      });
    }

    // ── 6. Buat pembayaran Xendit (QRIS / Invoice) ─────────
    if (createdOrders.length > 0) {
      const konsumen = await this.prisma.pengguna.findUnique({
        where: { id: penggunaId },
        select: { nama: true, email: true, noTelepon: true },
      });

      try {
        await this.helpers.processXenditPayment(
          createdOrders,
          data.metodeBayar,
          konsumen,
          data.mobileNumber,
        );
      } catch (err: any) {
        // Pembayaran Xendit gagal → pesanan tetap tersimpan
        this.logger.error("Xendit payment failed:", err?.message);
      }

      // ── 7. Jadwalkan auto-cancel 24 jam ───────────────────
      await this.helpers.scheduleAutoCancels(createdOrders.map((o) => o.id));
    }

    return createdOrders;
  }
}
