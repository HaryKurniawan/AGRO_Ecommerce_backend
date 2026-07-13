import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { TrenProdukBulananFilterDto } from "../dto/produk-terlaris-filter.dto";
import {
  monthYearToDateRange,
  prevMonthRange,
} from "../utils/period-to-date-range.util";
import { mapTrenProdukBulananData } from "../mappers/tren-produk-bulanan.mapper";

@Injectable()
export class GetTrenProdukBulananQuery {
  constructor(private readonly prisma: PrismaService) {}

  async execute(filters: TrenProdukBulananFilterDto) {
    const now = new Date();
    const period = filters.period || "MONTH";
    const limit = filters.limit ?? 10;

    let currentRange: { gte: Date; lte: Date; label: string };
    let prevRange: { gte: Date; lte: Date; label: string };
    let month = filters.month;
    let year = filters.year;

    if (period === "WEEK") {
      const startCurrent = new Date(now);
      startCurrent.setDate(now.getDate() - 7);
      startCurrent.setHours(0, 0, 0, 0);

      const startPrev = new Date(startCurrent);
      startPrev.setDate(startCurrent.getDate() - 7);

      const endPrev = new Date(startCurrent);
      endPrev.setMilliseconds(endPrev.getMilliseconds() - 1);

      currentRange = { gte: startCurrent, lte: now, label: "7 Hari Terakhir" };
      prevRange = { gte: startPrev, lte: endPrev, label: "7 Hari Sebelumnya" };
    } else if (period === "6_MONTHS" || period === ("SIX_MONTHS" as any)) {
      const startCurrent = new Date(now);
      startCurrent.setMonth(now.getMonth() - 6);
      startCurrent.setDate(1);
      startCurrent.setHours(0, 0, 0, 0);

      const startPrev = new Date(startCurrent);
      startPrev.setMonth(startCurrent.getMonth() - 6);

      const endPrev = new Date(startCurrent);
      endPrev.setMilliseconds(endPrev.getMilliseconds() - 1);

      currentRange = { gte: startCurrent, lte: now, label: "6 Bulan Terakhir" };
      prevRange = { gte: startPrev, lte: endPrev, label: "6 Bulan Sebelumnya" };
    } else if (period === "YEAR") {
      year = year ?? now.getFullYear();
      const startCurrent = new Date(year, 0, 1, 0, 0, 0, 0);
      const endCurrent = new Date(year, 11, 31, 23, 59, 59, 999);

      const startPrev = new Date(year - 1, 0, 1, 0, 0, 0, 0);
      const endPrev = new Date(year - 1, 11, 31, 23, 59, 59, 999);

      currentRange = {
        gte: startCurrent,
        lte: endCurrent,
        label: `Tahun ${year}`,
      };
      prevRange = { gte: startPrev, lte: endPrev, label: `Tahun ${year - 1}` };
    } else {
      month = month ?? now.getMonth() + 1;
      year = year ?? now.getFullYear();
      currentRange = monthYearToDateRange(month, year);
      prevRange = prevMonthRange(month, year);
    }

    const whereBase = {
      tokoId: filters.tokoId,
      status: "SELESAI" as const,
    };

    const [txCurrent, txPrev] = await Promise.all([
      this.prisma.itemPesananEcom.findMany({
        where: {
          pesanan: {
            ...whereBase,
            updatedAt: { gte: currentRange.gte, lte: currentRange.lte },
          }
        },
        select: { produkId: true, jumlah: true, harga: true, pesananId: true, produk: { select: { beratGram: true } } },
      }),
      this.prisma.itemPesananEcom.findMany({
        where: {
          pesanan: {
            ...whereBase,
            updatedAt: { gte: prevRange.gte, lte: prevRange.lte },
          }
        },
        select: { produkId: true, jumlah: true, harga: true, produk: { select: { beratGram: true } } },
      }),
    ]);

    const currentMap = new Map<string, any>();
    for (const t of txCurrent) {
      if (!currentMap.has(t.produkId)) {
        currentMap.set(t.produkId, {
          produkId: t.produkId,
          _sum: { jumlahTerjual: 0, totalHargaJual: 0 },
          _count: { id: new Set() },
        });
      }
      const agg = currentMap.get(t.produkId);
      const kg = (t.produk?.beratGram || 1000) / 1000;
      const jumlahKg = t.jumlah * kg;
      agg._sum.jumlahTerjual += jumlahKg;
      agg._sum.totalHargaJual += t.jumlah * t.harga;
      agg._count.id.add(t.pesananId);
    }
    const aggCurrent = Array.from(currentMap.values()).map(a => ({
      ...a,
      _count: { id: a._count.id.size }
    })).sort((a, b) => b._sum.jumlahTerjual - a._sum.jumlahTerjual)
      .slice(0, limit);

    const prevMap = new Map<string, any>();
    for (const t of txPrev) {
      if (!prevMap.has(t.produkId)) {
        prevMap.set(t.produkId, {
          produkId: t.produkId,
          _sum: { jumlahTerjual: 0, totalHargaJual: 0 },
        });
      }
      const agg = prevMap.get(t.produkId);
      const kg = (t.produk?.beratGram || 1000) / 1000;
      const jumlahKg = t.jumlah * kg;
      agg._sum.jumlahTerjual += jumlahKg;
      agg._sum.totalHargaJual += t.jumlah * t.harga;
    }
    const aggPrev = Array.from(prevMap.values());

    const produkIds = aggCurrent.map((a) => a.produkId);
    const produks = await this.prisma.produkEcom.findMany({
      where: { id: { in: produkIds } },
      select: {
        id: true,
        nama: true,
        namaEtalase: true,
        gambarUrl: true,
        satuan: true,
        kategori: { select: { id: true, nama: true, icon: true } },
      },
    });

    return mapTrenProdukBulananData(
      aggCurrent,
      aggPrev,
      produks,
      limit,
      filters.tokoId,
      currentRange.label,
      prevRange.label,
      month,
      year,
    );
  }
}
