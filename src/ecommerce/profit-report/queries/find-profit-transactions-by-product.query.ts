import { Injectable } from "@nestjs/common";
import { TransaksiKeuntungan, TransaksiKeuntunganBatch } from "@prisma/client";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { ProfitReportFiltersDto } from "../dto/profit-report-filters.dto";

@Injectable()
export class FindProfitTransactionsByProductQuery {
  constructor(private prisma: PrismaService) {}

  async execute(
    produkId: string,
    filters: ProfitReportFiltersDto,
  ): Promise<{
    transactions: (TransaksiKeuntungan & {
      pesanan: { id_pesanan: string };
      batchDetails: (TransaksiKeuntunganBatch & {
        stokMasuk: { tanggalMasuk: Date };
      })[];
    })[];
    total: number;
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
          lte: new Date(new Date(filters.endDate).setHours(23, 59, 59, 999)),
        },
      }),
      ...(filters.status && {
        statusPesanan: filters.status,
      }),
    };

    const [transactions, total] = await Promise.all([
      this.prisma.transaksiKeuntungan.findMany({
        where,
        include: {
          pesanan: { select: { id_pesanan: true },
          },
          batchDetails: {
            include: {
              stokMasuk: {
                select: { tanggalMasuk: true },
              },
            },
          },
        },
        orderBy: {
          tanggalTransaksi: "desc",
        },
        skip: ((filters.page || 1) - 1) * (filters.limit || 20),
        take: filters.limit || 20,
      }),
      this.prisma.transaksiKeuntungan.count({ where }),
    ]);

    return { transactions, total };
  }
}

