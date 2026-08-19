import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { ProfitSummaryFiltersDto } from "../dto/profit-report-filters.dto";

@Injectable()
export class GetProfitSummaryByTokoQuery {
  constructor(private prisma: PrismaService) {}

  async execute(
    tokoId: string,
    filters: ProfitSummaryFiltersDto,
  ): Promise<{
    totalKeuntungan: number;
    totalPenjualan: number;
    totalHargaBeli: number;
    totalTransaksi: number;
    trendKeuntungan: { periode: string; keuntungan: number; penjualan: number }[];
    transaksiDetail: any[];
  }> {
    const where: any = {
      tokoId,
      ...(filters.startDate && {
        tanggalTransaksi: {
          gte: new Date(filters.startDate),
        },
      }),
      ...(filters.endDate && {
        tanggalTransaksi: {
          ...((filters.startDate && { gte: new Date(filters.startDate) }) ||
            {}),
          lte: new Date(new Date(filters.endDate).setHours(23, 59, 59, 999)),
        },
      }),
      statusPesanan: { in: ["SELESAI", "DITUTUP"] as any },
    };

    if (filters.isB2B !== undefined) {
      where.pesanan = {
        isGrosir: filters.isB2B,
      };
    }

    const records = await this.prisma.transaksiKeuntungan.findMany({
      where,
      select: {
        tanggalTransaksi: true,
        jumlahTerjual: true,
        hargaJual: true,
        totalHargaBeli: true,
        pesanan: { select: { id_pesanan: true } },
        produk: { select: { nama: true } },
      },
      orderBy: {
        tanggalTransaksi: "asc",
      },
    });

    let totalPenjualan = 0;
    let totalHargaBeli = 0;
    const trendMap = new Map<string, { keuntungan: number; penjualan: number }>();

    // Determine grouping type based on filter range
    let groupBy = "month";
    if (filters.startDate && filters.endDate) {
      const diffTime = Math.abs(new Date(filters.endDate).getTime() - new Date(filters.startDate).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 35) {
        groupBy = "day"; // Use daily grouping for ranges <= 35 days
      }
    } else if (filters.startDate) {
        // If only start date is provided, and it's within a month, group by day
        const diffTime = Math.abs(new Date().getTime() - new Date(filters.startDate).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 35) {
            groupBy = "day";
        }
    }

    for (const record of records) {
      const sales = record.jumlahTerjual * record.hargaJual;
      const cogs = record.totalHargaBeli;
      const profit = sales - cogs;

      totalPenjualan += sales;
      totalHargaBeli += cogs;

      const date = new Date(record.tanggalTransaksi);
      
      let periodKey = "";
      if (groupBy === "day") {
        periodKey = date.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
        });
      } else {
        periodKey = date.toLocaleDateString("id-ID", {
            month: "short",
            year: "numeric",
        });
      }

      const existing = trendMap.get(periodKey) || { keuntungan: 0, penjualan: 0 };
      existing.keuntungan += profit;
      existing.penjualan += sales;
      trendMap.set(periodKey, existing);
    }

    const totalKeuntungan = totalPenjualan - totalHargaBeli;

    const trendKeuntungan = Array.from(trendMap.entries()).map(([periode, val]) => ({
      periode,
      keuntungan: val.keuntungan,
      penjualan: val.penjualan,
    }));

    const transaksiDetail = records.map((r) => ({
      tanggal: r.tanggalTransaksi,
      nomorPesanan: r.pesanan?.id_pesanan || "-",
      namaProduk: r.produk?.nama || "-",
      jumlahTerjual: r.jumlahTerjual,
      keuntungan: (r.jumlahTerjual * r.hargaJual) - r.totalHargaBeli,
    }));

    return {
      totalKeuntungan,
      totalPenjualan,
      totalHargaBeli,
      totalTransaksi: records.length,
      trendKeuntungan,
      transaksiDetail,
    };
  }
}

