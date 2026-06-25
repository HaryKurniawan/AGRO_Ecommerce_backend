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
    // external_id berupa gabungan order ID dipisahkan "-"
    const orderIds = externalId.split("-");
    const pesananList = await this.prisma.pesananEcom.findMany({
      where: { id: { in: orderIds } },
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
        const updated = await this.prisma.pesananEcom.update({
          where: { id: pesanan.id },
          data: { status: "DIPROSES" },
          include: {
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
          `Pesanan ${pesanan.id} status updated to DIPROSES via Xendit webhook (Event: PAID)`,
        );

        // Update profit transaction status
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

        // Emit SSE event ke frontend untuk real-time update
        this.eventEmitter.emit("order.status.updated", {
          orderId: pesanan.id,
          status: updated.status,
          tokoId: pesanan.tokoId,
        });

        // Auto-Generate Pengajuan Stok untuk pesanan B2B
        if (updated.isGrosir) {
          try {
            let gudangId = "B2B_AUTO_WAREHOUSE";
            for (const orderItem of updated.item) {
              const mappings = orderItem.produk?.masterProduk?.mappingGudang;
              if (mappings && mappings.length > 0) {
                gudangId = mappings[0].gudangId;
                break;
              }
            }

            let gpsLink = "";
            try {
              if (updated.alamatKirim) {
                const alamatObj = JSON.parse(updated.alamatKirim);
                if (alamatObj.lat && alamatObj.lng) {
                  gpsLink = `(GPS: https://www.google.com/maps?q=${alamatObj.lat},${alamatObj.lng})`;
                }
              }
            } catch (e) {
              // Ignore parse error
            }

            const catatan =
              `Pesanan B2B (${updated.id}): Kirim langsung ke alamat konsumen ${gpsLink}`.trim();

            await this.prisma.pengajuanStokToko.create({
              data: {
                tokoId: updated.tokoId || "",
                gudangId: gudangId,
                status: "SELESAI",
                modePengemasan: "DEFAULT",
                catatan: catatan,
                items: {
                  create: updated.item.map((i) => {
                    const mapped =
                      i.produk?.masterProduk?.mappingGudang?.[0];
                    return {
                      produkGudangId: mapped?.produkGudangId || "UNKNOWN",
                      namaProduk: i.produk?.nama || "Unknown Product",
                      satuan: i.produk?.satuan || "kg",
                      hargaGudang: i.produk?.harga || 0,
                      jumlahPermintaan: i.jumlah,
                      jumlahDisetujui: i.jumlah,
                    };
                  }),
                },
              },
            });
            this.logger.log(
              `Auto-generated PengajuanStokToko B2B for order ${updated.id}`,
            );
          } catch (err) {
            this.logger.error(
              `Failed to auto-generate B2B PengajuanStokToko for ${updated.id}:`,
              err,
            );
          }
        }
      }
      // EVENT: EXPIRED
      else if (event === "EXPIRED" && pesanan.status === "MENUNGGU_BAYAR") {
        const updated = await this.prisma.pesananEcom.update({
          where: { id: pesanan.id },
          data: { status: "DIBATALKAN" },
        });

        this.logger.log(
          `Pesanan ${pesanan.id} status updated to DIBATALKAN via Xendit webhook (Event: EXPIRED)`,
        );

        // Batalkan profit transaction
        try {
          await this.profitReportService.handleOrderCancellation(pesanan.id);
        } catch (err) {
          this.logger.error(
            `Failed to handle profit transaction cancellation for ${pesanan.id}:`,
            err,
          );
        }

        // Emit SSE event ke frontend
        this.eventEmitter.emit("order.status.updated", {
          orderId: pesanan.id,
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

    const orderIds = orderId.split("-");
    const pesananList = await this.prisma.pesananEcom.findMany({
      where: { id: { in: orderIds } },
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
          where: { id: pesanan.id },
          data: { status: "DIPROSES" },
        });
        this.eventEmitter.emit("order.status.updated", {
          orderId: pesanan.id,
          status: updated.status,
          tokoId: pesanan.tokoId,
        });
      } else if (
        event === "EXPIRED" &&
        pesanan.status === "MENUNGGU_BAYAR"
      ) {
        const updated = await this.prisma.pesananEcom.update({
          where: { id: pesanan.id },
          data: { status: "DIBATALKAN" },
        });
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
