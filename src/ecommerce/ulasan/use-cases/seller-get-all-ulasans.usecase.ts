import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class SellerGetAllReviewsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(penggunaId: string, page = 1, limit = 20) {
    const profilPenjual = await this.prisma.profilPenjual.findFirst({
      where: { penggunaId },
    });
    if (!profilPenjual) {
      throw new NotFoundException("Profil Penjual tidak ditemukan");
    }

    const toko = await this.prisma.toko.findUnique({
      where: { penjualId: profilPenjual.id },
    });
    if (!toko) {
      throw new NotFoundException("Toko Anda tidak ditemukan");
    }

    const skip = (page - 1) * limit;

    const [ulasan, total] = await Promise.all([
      this.prisma.ulasanProdukEcom.findMany({
        where: {
          produk: { tokoId: toko.id },
        },
        include: {
          pengguna: { select: { id: true, nama: true } },
          produk: { select: { id: true, nama: true, gambarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.ulasanProdukEcom.count({
        where: {
          produk: { tokoId: toko.id },
        },
      }),
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
