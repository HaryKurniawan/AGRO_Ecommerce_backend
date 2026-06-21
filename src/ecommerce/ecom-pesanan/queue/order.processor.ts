import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { UpdateOrderStatusUseCase } from "../use-cases/update-pesanan-status.usecase";
import { PesananEcomsRepository } from "../repositories/ecom-pesanans.repository";

@Processor("order")
export class OrderProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderProcessor.name);

  constructor(
    private readonly updateOrderStatus: UpdateOrderStatusUseCase,
    private readonly ordersRepo: PesananEcomsRepository,
  ) {
    super();
  }

  async process(job: Job) {
    if (job.name === "cancelUnpaidOrder") {
      await this.handleCancelUnpaidOrder(job);
    }
  }

  private async handleCancelUnpaidOrder(job: Job) {
    const { orderId } = job.data;
    this.logger.debug(`Checking if order ${orderId} needs to be canceled...`);

    const order = await this.ordersRepo.findUnique({ where: { id: orderId } });
    if (!order) {
      this.logger.warn(`Order ${orderId} not found for auto-cancellation`);
      return;
    }

    if (order.status === "MENUNGGU_BAYAR") {
      this.logger.log(`Auto-canceling unpaid order ${orderId}`);
      await this.updateOrderStatus.execute(orderId, "DIBATALKAN");
      this.logger.log(`Successfully canceled order ${orderId}`);
    } else {
      this.logger.debug(
        `Order ${orderId} is ${order.status}, skipping auto-cancellation`,
      );
    }
  }
}
