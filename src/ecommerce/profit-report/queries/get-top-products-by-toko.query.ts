import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { ProfitSummaryFiltersDto } from "../dto/profit-report-filters.dto";

@Injectable()
export class GetTopProductsByTokoQuery {
  constructor(private prisma: PrismaService) {}

  async execute(
    tokoId: string,
    filters: ProfitSummaryFiltersDto,
    limit: number = 5,
  ): Promise<
    Array<{
      produkId: string;
      namaProduk: string;
      totalKeuntungan: number;
      totalTerjual: number;
    }>
  > {
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
          lte: new Date(filters.endDate),
        },
      }),
    };

    if (filters.isB2B !== undefined) {
      where.pesanan = {
        isGrosir: filters.isB2B,
      };
    }

    const records = await this.prisma.transaksiKeuntungan.findMany({
      where,
      select: {
        produkId: true,
        jumlahTerjual: true,
        hargaJual: true,
        totalHargaBeli: true,
      },
    });

    const productMap = new Map<string, { totalKeuntungan: number; totalTerjual: number }>();
    for (const record of records) {
      const existing = productMap.get(record.produkId) || { totalKeuntungan: 0, totalTerjual: 0 };
      const keuntungan = (record.jumlahTerjual * record.hargaJual) - record.totalHargaBeli;
      existing.totalKeuntungan += keuntungan;
      existing.totalTerjual += record.jumlahTerjual;
      productMap.set(record.produkId, existing);
    }

    const sortedProducts = Array.from(productMap.entries())
      .map(([produkId, stats]) => ({
        produkId,
        totalKeuntungan: stats.totalKeuntungan,
        totalTerjual: stats.totalTerjual,
      }))
      .sort((a, b) => b.totalKeuntungan - a.totalKeuntungan)
      .slice(0, limit);

    // Get product names
    const produkIds = sortedProducts.map((r) => r.produkId);
    const products = await this.prisma.produkEcom.findMany({
      where: { id: { in: produkIds } },
      select: { id: true, nama: true, namaEtalase: true },
    });

    return sortedProducts.map((r) => {
      const product = products.find((p) => p.id === r.produkId);
      return {
        produkId: r.produkId,
        namaProduk: product?.namaEtalase || product?.nama || "Unknown Product",
        totalKeuntungan: r.totalKeuntungan,
        totalTerjual: r.totalTerjual,
      };
    });
  }
}
