import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class StartDeliveryBatchUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(batchId: string) {
    const batch = await this.prisma.batchPengiriman.findUnique({
      where: { id: batchId },
      include: { items: true },
    });

    if (!batch) throw new NotFoundException("Batch tidak ditemukan");
    if (batch.status !== "MENUNGGU" && batch.status !== "SIAP_KIRIM") {
      throw new NotFoundException("Batch sudah dimulai atau selesai");
    }

    return this.prisma.batchPengiriman.update({
      where: { id: batchId },
      data: {
        status: "DALAM_PERJALANAN",
        mulaiKirim: new Date(),
      },
      include: { items: { orderBy: { urutanKe: "asc" } } },
    });
  }
}
