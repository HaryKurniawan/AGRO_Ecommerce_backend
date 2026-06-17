import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class GetStoreBatchesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(tokoId: string, query: { tanggal?: string }) {
    const tanggal = query.tanggal ? new Date(query.tanggal) : new Date();
    tanggal.setHours(0, 0, 0, 0);

    return this.prisma.batchPengiriman.findMany({
      where: {
        tokoId,
        tanggal: {
          gte: tanggal,
          lt: new Date(tanggal.getTime() + 86400000),
        },
      },
      include: {
        items: {
          orderBy: { urutanKe: "asc" },
        },
      },
      orderBy: { tipeBatch: "asc" },
    });
  }
}
