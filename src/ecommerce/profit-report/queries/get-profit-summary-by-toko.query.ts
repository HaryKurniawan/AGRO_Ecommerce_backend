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
      totalKeuntungan,
      totalPenjualan,
      totalHargaBeli,
      totalTransaksi: records.length,
    };
  }
}
