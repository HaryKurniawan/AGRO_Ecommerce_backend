import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class MarkDeliveryItemDeliveredUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(batchId: string, pesananId: string) {
    const item = await this.prisma.itemBatchPengiriman.findFirst({
      where: { batchId, pesananId },
    });

    if (!item) throw new NotFoundException("Item batch tidak ditemukan");

    await this.prisma.itemBatchPengiriman.update({
      where: { id: item.id },
      data: { status: "TERKIRIM" },
    });

    // Check if all items are delivered
    const remainingItems = await this.prisma.itemBatchPengiriman.count({
      where: {
        batchId,
        status: { not: "TERKIRIM" },
      },
    });

    // If all items delivered, mark batch as complete
    if (remainingItems === 0) {
      await this.prisma.batchPengiriman.update({
        where: { id: batchId },
        data: {
          status: "SELESAI",
          selesaiKirim: new Date(),
        },
      });
    }

    return { pesananId, status: "TERKIRIM", remainingItems };
  }
}
