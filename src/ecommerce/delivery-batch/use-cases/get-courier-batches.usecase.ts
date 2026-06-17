import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class GetCourierBatchesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(kurirPenggunaId: string, query: { tanggal?: string }) {
    const tanggal = query.tanggal ? new Date(query.tanggal) : new Date();
    tanggal.setHours(0, 0, 0, 0);

    return this.prisma.batchPengiriman.findMany({
      where: {
        kurirPenggunaId,
        tanggal: {
          gte: tanggal,
          lt: new Date(tanggal.getTime() + 86400000),
        },
      },
      include: {
        items: {
          orderBy: { urutanKe: "asc" },
        },
        toko: {
          select: { nama: true, lat: true, lng: true, alamat: true },
        },
      },
      orderBy: { tipeBatch: "asc" },
    });
  }
}
