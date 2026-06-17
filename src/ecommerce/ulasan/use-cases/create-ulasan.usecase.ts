import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { CreateReviewDto } from "../dto/create-ulasan.dto";

@Injectable()
export class CreateReviewUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(penggunaId: string, dto: CreateReviewDto) {
    const itemPesanan = await this.prisma.itemPesananEcom.findUnique({
      where: { id: dto.itemPesananId },
      include: { pesanan: true, ulasan: true },
    });

    if (!itemPesanan)
      throw new NotFoundException("Item pesanan tidak ditemukan");
    if (itemPesanan.pesanan.konsumenId !== penggunaId)
      throw new ForbiddenException("Anda tidak memiliki akses ke item ini");
    if (itemPesanan.pesanan.status !== "SELESAI")
      throw new BadRequestException(
        "Ulasan hanya bisa diberikan setelah pesanan selesai",
      );
    if (itemPesanan.ulasan)
      throw new BadRequestException(
        "Anda sudah memberikan ulasan untuk produk ini",
      );

    const ulasan = await this.prisma.ulasanProdukEcom.create({
      data: {
        itemPesananId: dto.itemPesananId,
        produkId: itemPesanan.produkId,
        pesananId: itemPesanan.pesananId,
        penggunaId,
        rating: dto.rating,
        ulasan: dto.ulasan,
      },
    });

    return ulasan;
  }
}
