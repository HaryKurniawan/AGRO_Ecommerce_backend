import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class GetMarginHistoryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(tokoId?: string) {
    const where: any = {};
    if (tokoId) {
      where.tokoId = tokoId;
    }

    const history = await this.prisma.riwayatMargin.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        toko: { select: { nama: true } },
        produk: { select: { nama: true } },
      },
    });

    return history;
  }
}
