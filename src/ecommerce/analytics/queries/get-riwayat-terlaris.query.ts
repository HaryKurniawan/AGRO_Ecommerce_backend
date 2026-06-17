import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { RiwayatBulananFilterDto } from "../dto/produk-terlaris-filter.dto";
import {
  monthYearToDateRange,
  prevMonthRange,
} from "../utils/period-to-date-range.util";
import { mapRiwayatTerlarisData } from "../mappers/riwayat-terlaris.mapper";

@Injectable()
export class GetRiwayatTerlarisQuery {
  constructor(private readonly prisma: PrismaService) {}

  async execute(filters: RiwayatBulananFilterDto) {
    const now = new Date();
    const month = filters.month ?? now.getMonth() + 1;
    const year = filters.year ?? now.getFullYear();
    const limit = filters.limit ?? 5;

    const currentRange = monthYearToDateRange(month, year);
    const prevRange = prevMonthRange(month, year);

    const whereBase = {
      statusPesanan: "SELESAI" as const,
      ...(filters.tokoId && { tokoId: filters.tokoId }),
    };

    const [txCurrent, txPrev] = await Promise.all([
      this.prisma.transaksiKeuntungan.findMany({
        where: {
          ...whereBase,
          tanggalTransaksi: { gte: currentRange.gte, lte: currentRange.lte },
        },
        select: { produkId: true, jumlahTerjual: true, hargaJual: true, id: true },
      }),
      this.prisma.transaksiKeuntungan.findMany({
        where: {
          ...whereBase,
          tanggalTransaksi: { gte: prevRange.gte, lte: prevRange.lte },
        },
        select: { produkId: true, jumlahTerjual: true, hargaJual: true },
      }),
    ]);

    const currentMap = new Map<string, any>();
    for (const t of txCurrent) {
      if (!currentMap.has(t.produkId)) {
        currentMap.set(t.produkId, {
          produkId: t.produkId,
          _sum: { jumlahTerjual: 0, totalHargaJual: 0 },
          _count: { id: 0 },
        });
      }
      const agg = currentMap.get(t.produkId);
      agg._sum.jumlahTerjual += t.jumlahTerjual;
      agg._sum.totalHargaJual += t.jumlahTerjual * Number(t.hargaJual);
      agg._count.id += 1;
    }
    const aggCurrent = Array.from(currentMap.values());

    const prevMapData = new Map<string, any>();
    for (const t of txPrev) {
      if (!prevMapData.has(t.produkId)) {
        prevMapData.set(t.produkId, {
          produkId: t.produkId,
          _sum: { jumlahTerjual: 0, totalHargaJual: 0 },
        });
      }
      const agg = prevMapData.get(t.produkId);
      agg._sum.jumlahTerjual += t.jumlahTerjual;
      agg._sum.totalHargaJual += t.jumlahTerjual * Number(t.hargaJual);
    }
    const aggPrev = Array.from(prevMapData.values());

    const produkIds = aggCurrent.map((a) => a.produkId);
    const produks = await this.prisma.produkEcom.findMany({
      where: {
        id: { in: produkIds },
        ...(filters.kategoriId && { kategoriId: filters.kategoriId }),
      },
      select: {
        id: true,
        nama: true,
        namaEtalase: true,
        gambarUrl: true,
        satuan: true,
        kategoriId: true,
        toko: { select: { id: true, nama: true } },
        kategori: { select: { id: true, nama: true, icon: true } },
      },
    });

    return mapRiwayatTerlarisData(
      aggCurrent,
      aggPrev,
      produks,
      limit,
      month,
      year,
      currentRange.label,
      prevRange.label,
    );
  }
}
