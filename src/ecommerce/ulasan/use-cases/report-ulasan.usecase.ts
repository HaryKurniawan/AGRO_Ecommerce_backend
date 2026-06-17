import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class ReportReviewUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(reviewId: string, sellerUserId: string, alasan: string) {
    if (!alasan || alasan.trim().length < 10)
      throw new BadRequestException("Alasan laporan minimal 10 karakter");

    const ulasan = await this.prisma.ulasanProdukEcom.findUnique({
      where: { id: reviewId },
      include: {
        produk: {
          include: {
            toko: {
              include: {
                penjual: true,
              },
            },
          },
        },
      },
    });

    if (!ulasan) throw new NotFoundException("Review tidak ditemukan");

    const isOwner =
      (ulasan.produk as any).toko.penjual.penggunaId === sellerUserId;
    if (!isOwner)
      throw new ForbiddenException(
        "Anda tidak memiliki akses untuk melaporkan ulasan ini",
      );

    if ((ulasan as any).statusLaporan === "REPORTED")
      throw new BadRequestException(
        "Review ini sudah pernah Anda laporkan dan sedang ditinjau admin",
      );

    return this.prisma.ulasanProdukEcom.update({
      where: { id: reviewId },
      data: {
        alasanLaporan: alasan.trim(),
        dilaporkanPada: new Date(),
        statusLaporan: "REPORTED",
      },
    });
  }
}
