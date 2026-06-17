import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { GenerateDeliveryBatchUseCase } from "./generate-delivery-batch.usecase";

@Injectable()
export class GenerateGlobalDeliveryBatchesUseCase {
  private readonly logger = new Logger(
    GenerateGlobalDeliveryBatchesUseCase.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly generateBatchUC: GenerateDeliveryBatchUseCase,
  ) {}

  async execute(tipeBatch: "PAGI" | "SIANG") {
    const activeStores = await this.prisma.toko.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, nama: true },
    });

    const results: any[] = [];

    for (const store of activeStores) {
      try {
        const batch = await this.generateBatchUC.execute(store.id, tipeBatch);
        if (batch) {
          results.push({
            tokoId: store.id,
            tokoNama: store.nama,
            batchId: batch.id,
            kodeResi: batch.kodeResi,
            totalPesanan: batch.totalPesanan,
          });
        }
      } catch (err) {
        this.logger.error(
          `Gagal generate batch untuk toko ${store.nama}: ${err.message}`,
        );
      }
    }

    return results;
  }
}
