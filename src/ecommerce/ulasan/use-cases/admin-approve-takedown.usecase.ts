import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class AdminApproveTakedownUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(reviewId: string) {
    const ulasan = await this.prisma.ulasanProdukEcom.findUnique({
      where: { id: reviewId },
    });
    if (!ulasan) throw new NotFoundException("Review tidak ditemukan");

    const updated = await this.prisma.ulasanProdukEcom.update({
      where: { id: reviewId },
      data: { isHidden: true, statusLaporan: "TAKEDOWN_APPROVED" },
    });

    return updated;
  }
}
