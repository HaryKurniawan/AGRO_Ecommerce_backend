import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class GetDeliveryBatchDetailUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(batchId: string) {
    const batch = await this.prisma.batchPengiriman.findUnique({
      where: { id: batchId },
      include: {
        toko: {
          select: { nama: true, lat: true, lng: true, alamat: true },
        },
        items: {
          orderBy: { urutanKe: "asc" },
        },
      },
    });

    if (!batch) throw new NotFoundException("Batch tidak ditemukan");

    // Fetch full pesanan data for each item
    const itemsWithPesanan = await Promise.all(
      batch.items.map(async (item) => {
        const pesanan = await this.prisma.pesananEcom.findUnique({
          where: { id: item.pesananId },
          include: {
            konsumen: true,
            item: {
              include: { produk: { select: { nama: true, gambarUrl: true } } },
            },
            pengiriman: true,
          },
        });
        return { ...item, pesanan };
      }),
    );

    return { ...batch, items: itemsWithPesanan };
  }
}
