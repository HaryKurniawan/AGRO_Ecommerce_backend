import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { PolaPenjualanFilterDto } from "../dto/produk-terlaris-filter.dto";
import { mapPolaPenjualanData } from "../mappers/pola-penjualan.mapper";

@Injectable()
export class GetPolaPenjualanQuery {
  constructor(private readonly prisma: PrismaService) {}

  async execute(filters: PolaPenjualanFilterDto) {
    const year = filters.year ?? new Date().getFullYear();
    const month = filters.month;

    let startDate: Date, endDate: Date;
    if (month) {
      startDate = new Date(year, month - 1, 1, 0, 0, 0);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
    } else {
      startDate = new Date(year, 0, 1, 0, 0, 0);
      endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    }

    const pesanans = await this.prisma.pesananEcom.findMany({
      where: {
        tokoId: filters.tokoId,
        status: "SELESAI",
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { createdAt: true },
    });

    return mapPolaPenjualanData(
      pesanans,
      year,
      filters.tokoId,
      startDate,
      endDate,
    );
  }
}
