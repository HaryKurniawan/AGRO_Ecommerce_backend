import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { calculateHaversineDistance } from "../../../common/utils/haversine-distance.util";
import { optimizeRouteNearestNeighbor } from "../../../common/utils/route-optimization.util";

@Injectable()
export class GenerateDeliveryBatchUseCase {
  private readonly logger = new Logger(GenerateDeliveryBatchUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(tokoId: string, tipeBatch: "PAGI" | "SIANG") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Cek apakah batch sudah ada untuk hari ini + tipe ini + toko ini
    const existingBatch = await this.prisma.batchPengiriman.findFirst({
      where: {
        tokoId,
        tipeBatch,
        tanggal: {
          gte: today,
          lt: new Date(today.getTime() + 86400000),
        },
      },
    });

    if (existingBatch) {
      this.logger.log(
        `Batch ${tipeBatch} untuk toko ${tokoId} sudah ada: ${existingBatch.kodeResi}`,
      );
      return existingBatch;
    }

    // Cari pesanan yang:
    // 1. Status DIPROSES (sudah dikonfirmasi seller)
    // 2. Belum masuk batch manapun
    // 3. Milik toko ini
    const pesananSiapKirim = await this.prisma.pesananEcom.findMany({
      where: {
        tokoId,
        status: "DIPROSES",
        pengiriman: {
          status: "PICKUP_CONFIRMATION",
        },
      },
      include: {
        konsumen: {
          include: {
            addresses: {
              where: { isDefault: true },
              take: 1,
            },
          },
        },
        pengiriman: true,
        item: {
          include: {
            produk: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Filter pesanan yang belum masuk batch
    const pesananBelumDiBatch: typeof pesananSiapKirim = [];
    for (const pesanan of pesananSiapKirim) {
      const alreadyInBatch = await this.prisma.itemBatchPengiriman.findUnique({
        where: { pesananId: pesanan.id },
      });
      if (!alreadyInBatch) {
        pesananBelumDiBatch.push(pesanan);
      }
    }

    if (pesananBelumDiBatch.length === 0) {
      this.logger.log(
        `Tidak ada pesanan siap kirim untuk batch ${tipeBatch} toko ${tokoId}`,
      );
      return null;
    }

    // Get toko coordinates for route optimization
    const toko = await this.prisma.toko.findUnique({
      where: { id: tokoId },
      select: { lat: true, lng: true, nama: true },
    });

    // Build batch items with coordinates
    const batchItems = pesananBelumDiBatch.map((pesanan) => {
      const defaultAddr = pesanan.konsumen?.addresses?.[0];
      return {
        pesananId: pesanan.id,
        lat: defaultAddr?.lat ?? null,
        lng: defaultAddr?.lng ?? null,
        alamat: pesanan.alamatKirim,
        penerima:
          defaultAddr?.penerima || pesanan.konsumen?.nama || "Pelanggan",
      };
    });

    // Optimize route using nearest-neighbor heuristic
    const orderedItems = optimizeRouteNearestNeighbor(
      batchItems,
      toko?.lat ?? null,
      toko?.lng ?? null,
    );

    // Calculate total weight
    const totalBeratKg = pesananBelumDiBatch.reduce((sum, p) => {
      const itemWeight = p.item.reduce(
        (s, i) => s + (i.produk?.beratGram ?? 1000) * i.jumlah,
        0,
      );
      return sum + itemWeight / 1000;
    }, 0);

    // Calculate total estimated distance
    let estimasiJarakKm = 0;
    if (toko?.lat && toko?.lng) {
      let prevLat = toko.lat;
      let prevLng = toko.lng;
      for (const item of orderedItems) {
        if (item.lat && item.lng) {
          estimasiJarakKm += calculateHaversineDistance(
            prevLat,
            prevLng,
            item.lat,
            item.lng,
          );
          prevLat = item.lat;
          prevLng = item.lng;
        }
      }
      // Road distance ≈ Haversine × 1.3
      estimasiJarakKm = parseFloat((estimasiJarakKm * 1.3).toFixed(2));
    }

    // Estimate duration: ~15 min per drop-off + travel time
    const estimasiDurasiMenit =
      orderedItems.length * 15 + Math.round((estimasiJarakKm / 25) * 60); // 25 km/h average

    // Generate kode resi
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const count = await this.prisma.batchPengiriman.count({
      where: {
        tokoId,
        tanggal: {
          gte: today,
          lt: new Date(today.getTime() + 86400000),
        },
      },
    });
    const kodeResi = `BATCH-${dateStr}-${tipeBatch}-${String(count + 1).padStart(3, "0")}`;

    // Auto-assign courier from toko
    const kurirPenggunaId = toko
      ? (
          await this.prisma.toko.findUnique({
            where: { id: tokoId },
            select: { courierStaffId: true },
          })
        )?.courierStaffId
      : null;

    // Create the batch
    const batch = await this.prisma.batchPengiriman.create({
      data: {
        tokoId,
        kurirPenggunaId,
        kodeResi,
        tipeBatch,
        tanggal: today,
        totalPesanan: orderedItems.length,
        totalBeratKg: parseFloat(totalBeratKg.toFixed(2)),
        estimasiJarakKm: estimasiJarakKm || null,
        estimasiDurasiMenit: estimasiDurasiMenit || null,
        ruteOptimal: orderedItems.map((i, idx) => ({
          urutan: idx + 1,
          pesananId: i.pesananId,
          lat: i.lat,
          lng: i.lng,
          alamat: i.alamat,
          penerima: i.penerima,
        })),
        items: {
          create: orderedItems.map((item, idx) => ({
            pesananId: item.pesananId,
            urutanKe: idx + 1,
            lat: item.lat,
            lng: item.lng,
            alamat: item.alamat,
            penerima: item.penerima,
          })),
        },
      },
      include: { items: true },
    });

    this.logger.log(
      `✅ Batch ${kodeResi} dibuat: ${orderedItems.length} pesanan, ~${totalBeratKg.toFixed(1)}kg, ~${estimasiJarakKm}km`,
    );

    return batch;
  }
}
