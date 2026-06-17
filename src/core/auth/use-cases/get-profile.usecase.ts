import { Injectable, UnauthorizedException } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class GetProfileUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(penggunaId: string) {
    const pengguna = await this.prisma.pengguna.findUnique({
      where: { id: penggunaId },
      select: {
        id: true,
        email: true,
        nama: true,
        noTelepon: true,
        peran: true,
        createdAt: true,
        profilPenjual: {
          include: {
            toko: {
              select: {
                id: true,
                nama: true,
                slug: true,
                kabupaten: true,
                wilayah: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!pengguna) {
      throw new UnauthorizedException("Pengguna not found");
    }

    if (pengguna.profilPenjual) {
      const tokoId = pengguna.profilPenjual.toko?.id;
      if (tokoId) {
        const [totalProduk, totalPenjualanAgg, ratingAgg] = await Promise.all([
          this.prisma.produkEcom.count({
            where: { tokoId },
          }),
          this.prisma.itemPesananEcom.aggregate({
            where: { produk: { tokoId } },
            _sum: { jumlah: true },
          }),
          this.prisma.ulasanProdukEcom.aggregate({
            where: { produk: { tokoId }, isHidden: false },
            _avg: { rating: true },
          }),
        ]);

        const rating = ratingAgg._avg.rating ?? 0;
        const totalPenjualan = totalPenjualanAgg._sum.jumlah ?? 0;

        (pengguna.profilPenjual as any).rating = rating;
        (pengguna.profilPenjual as any).totalPenjualan = totalPenjualan;
        (pengguna.profilPenjual as any).totalProduk = totalProduk;

        if (pengguna.profilPenjual.toko) {
          (pengguna.profilPenjual.toko as any).rating = rating;
          (pengguna.profilPenjual.toko as any).totalPenjualan = totalPenjualan;
          (pengguna.profilPenjual.toko as any).totalProduk = totalProduk;
        }
      } else {
        (pengguna.profilPenjual as any).rating = 0;
        (pengguna.profilPenjual as any).totalPenjualan = 0;
        (pengguna.profilPenjual as any).totalProduk = 0;
      }
    }

    const orderCount = await this.prisma.pesananEcom.count({
      where: { konsumenId: penggunaId },
    });

    return {
      ...pengguna,
      orderCount,
    };
  }
}
