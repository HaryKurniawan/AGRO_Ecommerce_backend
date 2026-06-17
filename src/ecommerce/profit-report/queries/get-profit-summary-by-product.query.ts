import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { ProfitReportFiltersDto } from "../dto/profit-report-filters.dto";

@Injectable()
export class GetProfitSummaryByProductQuery {
  constructor(private prisma: PrismaService) {}

  async execute(
    produkId: string,
    filters: ProfitReportFiltersDto,
  ): Promise<{
    totalTransaksi: number;
    totalKeuntungan: number;
    totalPenjualan: number;
    totalHargaBeli: number;
  }> {
    const where = {
      produkId,
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
      ...(filters.status && {
        statusPesanan: filters.status,
      }),
    };

    const records = await this.prisma.transaksiKeuntungan.findMany({
      where,
      select: {
        jumlahTerjual: true,
        hargaJual: true,
        totalHargaBeli: true,
      },
    });

    let totalPenjualan = 0;
    let totalHargaBeli = 0;
    for (const record of records) {
      totalPenjualan += record.jumlahTerjual * record.hargaJual;
      totalHargaBeli += record.totalHargaBeli;
    }
    const totalKeuntungan = totalPenjualan - totalHargaBeli;

    return {
      totalTransaksi: records.length,
      totalKeuntungan,
      totalPenjualan,
      totalHargaBeli,
    };
  }
}
