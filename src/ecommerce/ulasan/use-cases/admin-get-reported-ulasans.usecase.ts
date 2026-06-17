import { Injectable } from "@nestjs/common";
import { Prisma, StatusLaporanUlasan } from "@prisma/client";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class AdminGetReportedReviewsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: Prisma.UlasanProdukEcomWhereInput = {
      statusLaporan: status ? (status as StatusLaporanUlasan) : "REPORTED",
    };

    const [ulasan, total] = await Promise.all([
      this.prisma.ulasanProdukEcom.findMany({
        where,
        include: {
          pengguna: { select: { id: true, nama: true } },
          produk: { select: { id: true, nama: true, gambarUrl: true } },
        },
        orderBy: { dilaporkanPada: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.ulasanProdukEcom.count({ where }),
    ]);

    return {
      data: ulasan,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
