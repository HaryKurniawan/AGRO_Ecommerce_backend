import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class AdminGetAllReviewsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: Prisma.UlasanProdukEcomWhereInput = {};

    if (search) {
      where.OR = [
        { ulasan: { contains: search, mode: "insensitive" } },
        { produk: { nama: { contains: search, mode: "insensitive" } } },
        { pengguna: { nama: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [ulasan, total] = await Promise.all([
      this.prisma.ulasanProdukEcom.findMany({
        where,
        include: {
          pengguna: { select: { id: true, nama: true } },
          produk: { select: { id: true, nama: true, gambarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
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
