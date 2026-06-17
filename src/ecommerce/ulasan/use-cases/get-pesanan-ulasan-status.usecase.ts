import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class GetOrderReviewStatusUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pesananId: string, penggunaId: string) {
    const pesanan = await this.prisma.pesananEcom.findUnique({
      where: { id: pesananId },
      include: {
        item: {
          include: {
            produk: {
              select: { id: true, nama: true, gambarUrl: true, harga: true },
            },
            ulasan: true,
          },
        },
      },
    });

    if (!pesanan) throw new NotFoundException("Pesanan tidak ditemukan");
    if (pesanan.konsumenId !== penggunaId)
      throw new ForbiddenException("Anda tidak memiliki akses ke pesanan ini");

    return pesanan.item.map((item) => ({
      orderItemId: item.id,
      produkId: item.produkId,
      productNama: item.produk.nama,
      productFoto: item.produk.gambarUrl,
      productHarga: item.produk.harga,
      jumlah: item.jumlah,
      isReviewed: !!item.ulasan,
      review: item.ulasan ?? null,
    }));
  }
}
