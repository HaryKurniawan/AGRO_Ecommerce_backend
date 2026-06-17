import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class GetCartUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(penggunaId: string) {
    let keranjang = await this.prisma.keranjangEcom.findUnique({
      where: { konsumenId: penggunaId },
      include: {
        item: {
          include: {
            produk: {
              include: {
                toko: { select: { id: true, nama: true } },
                varian: { where: { isActive: true } },
              },
            },
            varianKemasan: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!keranjang) {
      const pengguna = await this.prisma.pengguna.findUnique({
        where: { id: penggunaId },
      });
      if (!pengguna) {
        throw new NotFoundException(
          "Pengguna not found. Cannot create keranjang.",
        );
      }
      keranjang = await this.prisma.keranjangEcom.create({
        data: { konsumenId: penggunaId },
        include: {
          item: {
            include: {
              produk: {
                include: {
                  toko: { select: { id: true, nama: true } },
                  varian: { where: { isActive: true } },
                },
              },
              varianKemasan: true,
            },
          },
        },
      });
    }

    return keranjang;
  }
}
