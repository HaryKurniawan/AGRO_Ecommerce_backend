import { Injectable } from "@nestjs/common";

import { PesananEcomsRepository } from "../repositories/ecom-pesanans.repository";
import { FindOrderByIdUseCase } from "./find-pesanan-by-id.usecase";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ProfitReportService } from "../../profit-report/profit-report.service";
import { StatusPesananEcom } from "@prisma/client";

@Injectable()
export class UpdateOrderStatusUseCase {
  constructor(
    private readonly ordersRepo: PesananEcomsRepository,
    private readonly findOrderById: FindOrderByIdUseCase,
    private readonly eventEmitter: EventEmitter2,
    private readonly profitReportService: ProfitReportService,
  ) {}

  async execute(id: string, status: string, fotoSebelumKirimUrl?: string) {
    await this.findOrderById.execute(id);
    const updatedOrder = await this.ordersRepo.update({
      where: { id },
      data: {
        status: status as
          | "MENUNGGU_BAYAR"
          | "DIPROSES"
          | "DIKIRIM"
          | "SELESAI"
          | "DIBATALKAN",
        ...(fotoSebelumKirimUrl && { fotoSebelumKirimUrl }),
      },
    });

    // Update profit transaction status
    try {
      await this.profitReportService.updateProfitTransactionStatus(
        id,
        updatedOrder.status as StatusPesananEcom,
      );
      console.log(
        `[UpdateOrderStatusUseCase] Updated profit transaction status for order ${id}`,
      );
    } catch (error) {
      console.error(
        `[UpdateOrderStatusUseCase] Error updating profit transaction status:`,
        error,
      );
      // Don't fail the entire process if profit tracking fails
    }

    // Handle order cancellation
    if (updatedOrder.status === "DIBATALKAN") {
      try {
        await this.profitReportService.handleOrderCancellation(id);
        console.log(
          `[UpdateOrderStatusUseCase] Handled order cancellation for order ${id}`,
        );
      } catch (error) {
        console.error(
          `[UpdateOrderStatusUseCase] Error handling order cancellation:`,
          error,
        );
        // Don't fail the entire process if profit tracking fails
      }
    }

    // Emit event for real-time SSE via Redis Pub/Sub
    const payload = {
      orderId: id,
      status: updatedOrder.status,
      tokoId: (updatedOrder as any).tokoId,
    };

    // Tetap emit lokal (opsional, jika ada logic internal yang listen event ini)
    this.eventEmitter.emit("order.status.updated", payload);

    return updatedOrder;
  }
}
