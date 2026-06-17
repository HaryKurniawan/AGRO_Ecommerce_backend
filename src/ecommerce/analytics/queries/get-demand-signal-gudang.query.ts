import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import {
  monthYearToDateRange,
  prevMonthRange,
} from "../utils/period-to-date-range.util";
import { DemandSignalItem } from "../use-cases/get-demand-signal-gudang.usecase";
import { mapDemandSignalData } from "../mappers/demand-signal.mapper";

@Injectable()
export class GetDemandSignalGudangQuery {
  constructor(private readonly prisma: PrismaService) {}

  async execute(params: {
    gudangId: string;
    month?: number;
    year?: number;
    limit?: number;
  }): Promise<{
    gudangId: string;
    period: { month: number; year: number; label: string };
    prevPeriod: { label: string };
    totalTokoAfiliasi: number;
    data: DemandSignalItem[];
  }> {
    const now = new Date();
    const month = params.month ?? now.getMonth() + 1;
    const year = params.year ?? now.getFullYear();
    const limit = params.limit ?? 15;

    const currentRange = monthYearToDateRange(month, year);
    const prevRange = prevMonthRange(month, year);

    const pengajuanStok = await this.prisma.pengajuanStokToko.findMany({
      where: { gudangId: params.gudangId },
      select: { tokoId: true },
      distinct: ["tokoId"],
    });

    const tokoIds = pengajuanStok.map((p) => p.tokoId);

    if (tokoIds.length === 0) {
      return {
        gudangId: params.gudangId,
        period: { month, year, label: currentRange.label },
        prevPeriod: { label: prevRange.label },
        totalTokoAfiliasi: 0,
        data: [],
      };
    }

    const [txCurrent, txPrev] = await Promise.all([
      this.prisma.transaksiKeuntungan.findMany({
        where: {
          tokoId: { in: tokoIds },
          statusPesanan: "SELESAI",
          tanggalTransaksi: { gte: currentRange.gte, lte: currentRange.lte },
        },
        select: { produkId: true, jumlahTerjual: true, hargaJual: true, id: true },
      }),
      this.prisma.transaksiKeuntungan.findMany({
        where: {
          tokoId: { in: tokoIds },
          statusPesanan: "SELESAI",
          tanggalTransaksi: { gte: prevRange.gte, lte: prevRange.lte },
        },
        select: { produkId: true, jumlahTerjual: true },
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
          _sum: { jumlahTerjual: 0 },
        });
      }
      const agg = prevMapData.get(t.produkId);
      agg._sum.jumlahTerjual += t.jumlahTerjual;
    }
    const aggPrev = Array.from(prevMapData.values());

    const produkIds = aggCurrent.map((a) => a.produkId);
    const produks = await this.prisma.produkEcom.findMany({
      where: { id: { in: produkIds } },
      select: {
        id: true,
        tokoId: true,
        nama: true,
        namaEtalase: true,
        masterProdukId: true,
        masterProduk: { select: { id: true, nama: true } },
      },
    });

    const masterProdukIds = produks
      .map((p) => p.masterProdukId)
      .filter(Boolean) as string[];
    let mappings: any[] = [];
    if (masterProdukIds.length > 0) {
      mappings = await this.prisma.mappingProdukGudang.findMany({
        where: {
          masterProdukId: { in: masterProdukIds },
          gudangId: params.gudangId,
        },
        select: { masterProdukId: true, produkGudangId: true },
      });
    }

    return mapDemandSignalData(
      aggCurrent,
      aggPrev,
      produks,
      mappings,
      tokoIds.length,
      params.gudangId,
      limit,
      month,
      year,
      currentRange.label,
      prevRange.label,
    );
  }
}
