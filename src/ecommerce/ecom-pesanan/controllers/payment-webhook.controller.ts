import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  HttpCode,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { ProfitReportService } from "../../profit-report/profit-report.service";

@ApiTags("Payment - Xendit Webhook")
@Controller("payment")
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly profitReportService: ProfitReportService,
  ) {}

  /**
   * Xendit Webhook Endpoint
   * Dipanggil oleh Xendit setiap kali status pembayaran berubah.
   * Endpoint ini WAJIB dikecualikan dari auth guard (public).
   */
  @Post("xendit-webhook")
  @HttpCode(200)
  @ApiOperation({
    summary: "Webhook Xendit — dipanggil oleh server Xendit secara otomatis",
  })
  async handleXenditWebhook(
    @Headers("x-callback-token") callbackToken: string,
    @Body() payload: Record<string, unknown>,
  ): Promise<{ message: string }> {
    // 1. Validasi token webhook untuk memastikan request berasal dari Xendit
    const expectedToken = this.configService.get<string>(
      "XENDIT_WEBHOOK_TOKEN",
    );
    if (expectedToken && callbackToken !== expectedToken) {
      this.logger.warn(
        `Invalid Xendit webhook token received: ${callbackToken}`,
      );
      throw new BadRequestException("Invalid webhook token");
    }

    const event = payload.status as string;
    const externalId = payload.external_id as string;

    this.logger.log(
      `Xendit webhook received: event=${event}, externalId=${externalId}`,
    );

    // 2. Hanya proses event "PAID" saja
    if (event !== "PAID") {
      this.logger.log(`Skipping non-PAID event: ${event}`);
      return { message: "Event ignored" };
    }

    // 3. Cari semua pesanan berdasarkan paymentId (externalId)
    //    externalId formatnya: "AGRO-{pesananId1}-{pesananId2}-..."
    //    Atau kita cari berdasarkan paymentId yang kita simpan
    const pesananList = await this.prisma.pesananEcom.findMany({
      where: { paymentId: externalId },
    });

    if (!pesananList || pesananList.length === 0) {
      this.logger.warn(
        `No pesanan found for paymentId (externalId): ${externalId}`,
      );
      return { message: "Pesanan not found" };
    }

    // 4. Update status semua pesanan terkait menjadi DIPROSES
    for (const pesanan of pesananList) {
      if (pesanan.status === "MENUNGGU_BAYAR") {
        const updated = await this.prisma.pesananEcom.update({
          where: { id: pesanan.id },
          data: { status: "DIPROSES" },
        });

        this.logger.log(
          `Pesanan ${pesanan.id} status updated to DIPROSES via Xendit webhook`,
        );

        // 5. Update profit transaction status
        try {
          await this.profitReportService.updateProfitTransactionStatus(
            pesanan.id,
            "DIPROSES",
          );
        } catch (err) {
          this.logger.error(
            `Failed to update profit transaction for ${pesanan.id}:`,
            err,
          );
        }

        // 6. Emit SSE event ke frontend untuk real-time update
        this.eventEmitter.emit("order.status.updated", {
          orderId: pesanan.id,
          status: updated.status,
          tokoId: pesanan.tokoId,
        });
      }
    }

    return { message: "Webhook processed successfully" };
  }
}
