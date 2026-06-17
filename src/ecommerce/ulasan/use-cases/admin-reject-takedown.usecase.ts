import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class AdminRejectTakedownUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(reviewId: string) {
    const ulasan = await this.prisma.ulasanProdukEcom.findUnique({
      where: { id: reviewId },
    });
    if (!ulasan) throw new NotFoundException("Review tidak ditemukan");

    return this.prisma.ulasanProdukEcom.update({
      where: { id: reviewId },
      data: { statusLaporan: "TAKEDOWN_REJECTED", isHidden: false },
    });
  }
}
