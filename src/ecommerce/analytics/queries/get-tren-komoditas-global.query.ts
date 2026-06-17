import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import {
  TrenKomoditasGlobalFilterDto,
  TrenKomoditasGlobalResponse,
} from "../dto/tren-komoditas-global.dto";
import {
  monthYearToDateRange,
  prevMonthRange,
  getYearMonthKey,
} from "../utils/period-to-date-range.util";
import { mapTrenKomoditasGlobalData } from "../mappers/tren-komoditas-global.mapper";

@Injectable()
export class GetTrenKomoditasGlobalQuery {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    filters: TrenKomoditasGlobalFilterDto,
  ): Promise<TrenKomoditasGlobalResponse> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const currentRange = monthYearToDateRange(month, year);
    const prevRange = prevMonthRange(month, year);

    const [txCurrent, txPrev] = await Promise.all([
      this.prisma.transaksiKeuntungan.findMany({
        where: {
          statusPesanan: "SELESAI",
          tanggalTransaksi: { gte: currentRange.gte, lte: currentRange.lte },
        },
        select: { produkId: true, jumlahTerjual: true, hargaJual: true, id: true },
      }),
      this.prisma.transaksiKeuntungan.findMany({
        where: {
          statusPesanan: "SELESAI",
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

    const allProdukIds = [
      ...new Set([
        ...aggCurrent.map((a) => a.produkId),
        ...aggPrev.map((a) => a.produkId),
      ]),
    ];

    const produks = await this.prisma.produkEcom.findMany({
      where: { id: { in: allProdukIds } },
      select: {
        id: true,
        tokoId: true,
        masterProdukId: true,
        masterProduk: {
          select: {
            id: true,
            nama: true,
            kodeKomoditasGlobal: true,
          },
        },
      },
    });

    const periodeKey = getYearMonthKey(new Date(year, month - 1, 1));
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevPeriodeKey = getYearMonthKey(
      new Date(prevYear, prevMonth - 1, 1),
    );

    return mapTrenKomoditasGlobalData(
      aggCurrent,
      aggPrev,
      produks,
      periodeKey,
      prevPeriodeKey,
      filters.kodeKomoditasGlobal,
    );
  }
}
