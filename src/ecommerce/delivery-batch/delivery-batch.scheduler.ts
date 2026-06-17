import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { GenerateGlobalDeliveryBatchesUseCase } from "./use-cases/generate-global-delivery-batches.usecase";

@Injectable()
export class DeliveryBatchScheduler {
  private readonly logger = new Logger(DeliveryBatchScheduler.name);

  constructor(
    private readonly generateGlobalBatchesUC: GenerateGlobalDeliveryBatchesUseCase,
  ) {}

  @Cron("0 1 * * *", { name: "generate-batch-pagi" })
  async generateBatchPagi() {
    this.logger.log("⏰ [SCHEDULER] Generating batch PAGI...");
    try {
      const results = await this.generateGlobalBatchesUC.execute("PAGI");
      this.logger.log(
        `✅ [SCHEDULER] Batch PAGI selesai: ${results.length} batch dibuat`,
      );
      for (const r of results) {
        this.logger.log(
          `   📦 ${r.tokoNama}: ${r.kodeResi} (${r.totalPesanan} pesanan)`,
        );
      }
    } catch (err) {
      this.logger.error(
        `❌ [SCHEDULER] Gagal generate batch PAGI: ${err.message}`,
      );
    }
  }

  @Cron("0 5 * * *", { name: "generate-batch-siang" })
  async generateBatchSiang() {
    this.logger.log("⏰ [SCHEDULER] Generating batch SIANG...");
    try {
      const results = await this.generateGlobalBatchesUC.execute("SIANG");
      this.logger.log(
        `✅ [SCHEDULER] Batch SIANG selesai: ${results.length} batch dibuat`,
      );
      for (const r of results) {
        this.logger.log(
          `   📦 ${r.tokoNama}: ${r.kodeResi} (${r.totalPesanan} pesanan)`,
        );
      }
    } catch (err) {
      this.logger.error(
        `❌ [SCHEDULER] Gagal generate batch SIANG: ${err.message}`,
      );
    }
  }
}
