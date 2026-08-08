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
import * as crypto from "crypto";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { ProfitReportService } from "../../profit-report/profit-report.service";
import { PerTokoTelegramService } from "../../../core/telegram/per-toko-telegram.service";

@ApiTags("Payment - Xendit Webhook")
@Controller("payment")
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly profitReportService: ProfitReportService,
    private readonly perTokoTelegramService: PerTokoTelegramService,
  ) {}

  /**
   * Xendit Webhook Endpoint
   * Dipanggil oleh Xendit setiap kali status invoice berubah.
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
    // 1. Validasi Callback Token Xendit
    const webhookToken =
      this.configService.get<string>("XENDIT_WEBHOOK_TOKEN") || "";
    if (webhookToken && callbackToken !== webhookToken) {
      this.logger.warn("Invalid Xendit callback token");
      throw new BadRequestException("Invalid callback token");
    }

    // 2. Normalisasi Payload Xendit Invoice
    const externalId = payload.external_id as string;
    const status = (payload.status as string)?.toUpperCase();

    let isPaid = false;
    let event = status;

    if (status === "PAID" || status === "SETTLED") {
      isPaid = true;
      event = "PAID";
    } else if (status === "EXPIRED") {
      event = "EXPIRED";
    }

    if (!externalId) {
      this.logger.warn("Webhook ignored: Missing external_id in payload");
      return { message: "Webhook ignored - No ID" };
    }

    this.logger.log(
      `Xendit webhook processed: externalId=${externalId}, isPaid=${isPaid}, event=${event}`,
    );

    if (!isPaid && event !== "EXPIRED") {
      this.logger.log(
        `Skipping event because it is not a success payment event or expired.`,
      );
      return { message: "Event ignored" };
    }

    // 3. Cari semua pesanan berdasarkan external_id
    // external_id berupa gabungan order ID dipisahkan ","
    const orderIds = externalId.split(",");
    const pesananList = await this.prisma.pesananEcom.findMany({
      where: { id_pesanan: { in: orderIds } },
    });

    if (!pesananList || pesananList.length === 0) {
      this.logger.warn(`No pesanan found for externalId: ${externalId}`);
      return { message: "Pesanan not found" };
    }

    // 4. Update status semua pesanan terkait sesuai event Xendit
    for (const pesanan of pesananList) {
      // EVENT: PAID
      if (
        event === "PAID" &&
        (pesanan.status === "MENUNGGU_BAYAR" ||
          pesanan.status === "DIBATALKAN")
      ) {
        const updateData: any = { status: "DIPROSES" };
        if (pesanan.isGrosir && !pesanan.jadwalKirim) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const hPlus2 = new Date(today);
          hPlus2.setDate(hPlus2.getDate() + 2);
          updateData.jadwalKirim = hPlus2;
        }

        const updated = await this.prisma.pesananEcom.update({
          where: { id_pesanan: pesanan.id_pesanan },
          data: updateData,
          include: {
            toko: { select: { nama: true } },
            konsumen: { select: { nama: true } },
            item: {
              include: {
                produk: {
                  include: {
                    masterProduk: {
                      include: { mappingGudang: true },
                    },
                  },
                },
              },
            },
          },
        });

        this.logger.log(
          `Pesanan ${pesanan.id_pesanan} status updated to DIPROSES via Xendit webhook (Event: PAID)`,
        );

        // Update profit transaction status
        try {
          await this.profitReportService.updateProfitTransactionStatus(
            pesanan.id_pesanan,
            "DIPROSES",
          );
        } catch (err) {
          this.logger.error(
            `Failed to update profit transaction for ${pesanan.id_pesanan}:`,
            err,
          );
        }

        this.eventEmitter.emit("order.status.updated", {
          orderId: pesanan.id_pesanan,
          status: updated.status,
          tokoId: pesanan.tokoId,
        });

        // ── Fire-and-forget: Kirim notif Telegram ke seller (Pesanan Dibayar) ──
        if (updated.tokoId) {
          const detailProdukText = updated.item?.map(i => {
            const namaProduk = i.produk?.namaEtalase || i.produk?.nama || "Produk";
            return `- ${namaProduk} (${i.jumlah}x)`;
          }).join("\n");

          void (async () => {
            try {
              await this.perTokoTelegramService.sendNewOrderNotif({
                tokoId: updated.tokoId!,
                orderId: updated.id_pesanan,
                namaToko: updated.toko?.nama || "Toko",
                namaPembeli: updated.konsumen?.nama || "Pembeli",
                totalHarga: Number(updated.totalHarga || 0),
                jumlahItem: updated.item?.length || 0,
                metodeBayar: updated.metodeBayar || "Online",
                detailProdukText,
              });
            } catch (error: any) {
              this.logger.error(`Gagal mengirim notifikasi Telegram pesanan ${updated.id_pesanan}: ${error?.message || error}`);
            }
          })();
        }
      }
      // EVENT: EXPIRED
      else if (event === "EXPIRED" && pesanan.status === "MENUNGGU_BAYAR") {
        const updated = await this.prisma.pesananEcom.update({
          where: { id_pesanan: pesanan.id_pesanan },
          data: { status: "DIBATALKAN" },
        });

        this.logger.log(
          `Pesanan ${pesanan.id_pesanan} status updated to DIBATALKAN via Xendit webhook (Event: EXPIRED)`,
        );

        // Batalkan profit transaction
        try {
          await this.profitReportService.handleOrderCancellation(pesanan.id_pesanan);
        } catch (err) {
          this.logger.error(
            `Failed to handle profit transaction cancellation for ${pesanan.id_pesanan}:`,
            err,
          );
        }

        // Emit SSE event ke frontend
        this.eventEmitter.emit("order.status.updated", {
          orderId: pesanan.id_pesanan,
          status: updated.status,
          tokoId: pesanan.tokoId,
        });
      }
    }

    return { message: "Webhook processed successfully" };
  }

  /**
   * Legacy Midtrans Webhook (kept for backward compatibility with existing pending orders)
   */
  @Post("midtrans-webhook")
  @HttpCode(200)
  @ApiOperation({
    summary: "Webhook Midtrans — legacy endpoint (tidak digunakan lagi)",
  })
  async handleMidtransWebhook(
    @Headers("x-callback-token") callbackToken: string,
    @Body() payload: Record<string, unknown>,
  ): Promise<{ message: string }> {
    const serverKey =
      this.configService.get<string>("MIDTRANS_SERVER_KEY") || "";
    const signatureKey = payload.signature_key as string;
    const orderId = payload.order_id as string;
    const statusCode = payload.status_code as string;
    const grossAmount = payload.gross_amount as string;

    if (serverKey && signatureKey) {
      const hash = crypto
        .createHash("sha512")
        .update(orderId + statusCode + grossAmount + serverKey)
        .digest("hex");
      if (hash !== signatureKey) {
        this.logger.warn("Invalid Midtrans signature key");
        throw new BadRequestException("Invalid signature");
      }
    }

    const transactionStatus = payload.transaction_status as string;
    const fraudStatus = payload.fraud_status as string;

    let isPaid = false;
    let event = transactionStatus;

    if (transactionStatus === "capture") {
      if (fraudStatus === "challenge") {
        event = "CHALLENGE";
      } else if (fraudStatus === "accept") {
        isPaid = true;
        event = "PAID";
      }
    } else if (transactionStatus === "settlement") {
      isPaid = true;
      event = "PAID";
    } else if (
      transactionStatus === "cancel" ||
      transactionStatus === "deny" ||
      transactionStatus === "expire"
    ) {
      event = "EXPIRED";
    }

    if (!orderId) {
      return { message: "Webhook ignored - No ID" };
    }

    if (!isPaid && event !== "EXPIRED") {
      return { message: "Event ignored" };
    }

    const orderIds = orderId.split(",");
    const pesananList = await this.prisma.pesananEcom.findMany({
      where: { id_pesanan: { in: orderIds } },
    });

    if (!pesananList || pesananList.length === 0) {
      return { message: "Pesanan not found" };
    }

    for (const pesanan of pesananList) {
      if (
        event === "PAID" &&
        (pesanan.status === "MENUNGGU_BAYAR" ||
          pesanan.status === "DIBATALKAN")
      ) {
        const updated = await this.prisma.pesananEcom.update({
          where: { id_pesanan: pesanan.id_pesanan },
          data: { status: "DIPROSES" },
        });
        this.eventEmitter.emit("order.status.updated", {
          orderId: pesanan.id_pesanan,
          status: updated.status,
          tokoId: pesanan.tokoId,
        });
      } else if (
        event === "EXPIRED" &&
        pesanan.status === "MENUNGGU_BAYAR"
      ) {
        const updated = await this.prisma.pesananEcom.update({
          where: { id_pesanan: pesanan.id_pesanan },
          data: { status: "DIBATALKAN" },
        });
        this.eventEmitter.emit("order.status.updated", {
          orderId: pesanan.id_pesanan,
          status: updated.status,
          tokoId: pesanan.tokoId,
        });
      }
    }

    return { message: "Webhook processed successfully" };
  }
}
