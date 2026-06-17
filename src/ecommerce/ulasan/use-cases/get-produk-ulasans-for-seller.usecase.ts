import { Injectable, ForbiddenException } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class GetProductReviewsForSellerUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(produkId: string, tokoId: string, page = 1, limit = 20) {
    const produk = await this.prisma.produkEcom.findFirst({
      where: { id: produkId, tokoId },
    });
    if (!produk)
      throw new ForbiddenException("Produk tidak ditemukan di toko Anda");

    const skip = (page - 1) * limit;
    const [ulasan, total] = await Promise.all([
      this.prisma.ulasanProdukEcom.findMany({
        where: { produkId },
        include: { pengguna: { select: { id: true, nama: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.ulasanProdukEcom.count({ where: { produkId } }),
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
