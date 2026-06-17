import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { StatusPesananEcom } from "@prisma/client";

import { PesananEcomsRepository } from "../repositories/ecom-pesanans.repository";
import { ProfitReportService } from "../../profit-report/profit-report.service";

@Injectable()
export class ConfirmPaymentUseCase {
  constructor(
    private readonly ordersRepo: PesananEcomsRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly profitReportService: ProfitReportService,
  ) {}

  async execute(pesananId: string, penggunaId: string) {
    // 1. Fetch the order
    const pesanan = await this.ordersRepo.findUnique({
      where: { id: pesananId },
    });

    if (!pesanan) {
      throw new NotFoundException(`Pesanan ${pesananId} tidak ditemukan`);
    }

    // 2. Only the owner (konsumen) may confirm payment
    if (pesanan.konsumenId !== penggunaId) {
      throw new ForbiddenException(
        "Anda tidak berhak mengkonfirmasi pembayaran pesanan ini",
      );
    }

    // 3. Only allowed when status is MENUNGGU_BAYAR
    if (pesanan.status !== "MENUNGGU_BAYAR") {
      throw new BadRequestException(
        `Konfirmasi pembayaran hanya dapat dilakukan saat status pesanan adalah MENUNGGU_BAYAR. Status saat ini: ${pesanan.status}`,
      );
    }

    // 4. Transition to DIPROSES
    const updated = await this.ordersRepo.update({
      where: { id: pesananId },
      data: { status: "DIPROSES" },
    });

    // 5. Update profit transaction status
    try {
      await this.profitReportService.updateProfitTransactionStatus(
        pesananId,
        updated.status as StatusPesananEcom,
      );
    } catch (err) {
      // Non-fatal: log and continue
      console.error(
        `[ConfirmPaymentUseCase] Failed to update profit transaction for ${pesananId}:`,
        err,
      );
    }

    // 6. Emit SSE event
    this.eventEmitter.emit("order.status.updated", {
      orderId: pesananId,
      status: updated.status,
      tokoId: updated.tokoId,
    });

    return updated;
  }
}
