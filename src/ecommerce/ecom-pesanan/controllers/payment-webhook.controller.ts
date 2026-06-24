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
   * Midtrans Webhook Endpoint
   * Dipanggil oleh Midtrans setiap kali status pembayaran berubah.
   * Endpoint ini WAJIB dikecualikan dari auth guard (public).
   */
  @Post("midtrans-webhook")
  @HttpCode(200)
  @ApiOperation({
    summary: "Webhook Midtrans — dipanggil oleh server Midtrans secara otomatis",
  })
  async handleMidtransWebhook(
    @Headers("x-callback-token") callbackToken: string,
    @Body() payload: Record<string, unknown>,
  ): Promise<{ message: string }> {
    // 1. Validasi Signature Key untuk Midtrans
    const serverKey = this.configService.get<string>("MIDTRANS_SERVER_KEY") || "";
    const signatureKey = payload.signature_key as string;
    const orderId = payload.order_id as string;
    const statusCode = payload.status_code as string;
    const grossAmount = payload.gross_amount as string;
    
    if (serverKey && signatureKey) {
      const hash = crypto.createHash("sha512").update(orderId + statusCode + grossAmount + serverKey).digest("hex");
      if (hash !== signatureKey) {
        this.logger.warn("Invalid Midtrans signature key");
        throw new BadRequestException("Invalid signature");
      }
    }

    // 2. Normalisasi Payload Midtrans
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
    } else if (transactionStatus === "cancel" || transactionStatus === "deny" || transactionStatus === "expire") {
      event = "EXPIRED";
    }

    if (!orderId) {
      this.logger.warn("Webhook ignored: Missing order_id in payload");
      return { message: "Webhook ignored - No ID" };
    }

    this.logger.log(`Midtrans webhook processed: orderId=${orderId}, isPaid=${isPaid}, event=${event}`);

    if (!isPaid && event !== "EXPIRED") {
      this.logger.log(`Skipping event because it is not a success payment event or expired.`);
      return { message: "Event ignored" };
    }

    // 3. Cari semua pesanan berdasarkan order_id (yang merupakan gabungan ID pesanan dipisahkan "-")
    const orderIds = orderId.split("-");
    const pesananList = await this.prisma.pesananEcom.findMany({
      where: { id: { in: orderIds } },
    });

    if (!pesananList || pesananList.length === 0) {
      this.logger.warn(
        `No pesanan found for orderId: ${orderId}`,
      );
      return { message: "Pesanan not found" };
    }

    // 4. Update status semua pesanan terkait sesuai event Xendit
    for (const pesanan of pesananList) {
      // EVENT: PAID
      // Mengubah status menjadi DIPROSES jika pesanan belum diproses.
      // Jika pesanan sebelumnya DIBATALKAN (misal expired lalu dibayar manual/telat), kita terima pembayarannya
      if (
        event === "PAID" &&
        (pesanan.status === "MENUNGGU_BAYAR" || pesanan.status === "DIBATALKAN")
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
                      include: { mappingGudang: true } 
                    } 
                  } 
                } 
              } 
            } 
          }
        });

        this.logger.log(
          `Pesanan ${pesanan.id} status updated to DIPROSES via Midtrans webhook (Event: PAID)`,
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
            // Coba ambil gudangId dari mapping master produk item pertama
            let gudangId = "B2B_AUTO_WAREHOUSE";
            for (const orderItem of updated.item) {
              const mappings = orderItem.produk?.masterProduk?.mappingGudang;
              if (mappings && mappings.length > 0) {
                gudangId = mappings[0].gudangId;
                break;
              }
            }

            // Coba ambil link koordinat Google Maps dari alamat pengiriman
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

            const catatan = `Pesanan B2B (${updated.id}): Kirim langsung ke alamat konsumen ${gpsLink}`.trim();

            await this.prisma.pengajuanStokToko.create({
              data: {
                tokoId: updated.tokoId || "",
                gudangId: gudangId,
                status: "SELESAI", // Asumsi SBU memproses & mengirim langsung
                modePengemasan: "DEFAULT",
                catatan: catatan,
                items: {
                  create: updated.item.map((i) => {
                    const mapped = i.produk?.masterProduk?.mappingGudang?.[0];
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
            this.logger.log(`Auto-generated PengajuanStokToko B2B for order ${updated.id}`);
          } catch (err) {
            this.logger.error(`Failed to auto-generate B2B PengajuanStokToko for ${updated.id}:`, err);
          }
        }
      }
      // EVENT: EXPIRED
      // Membatalkan pesanan otomatis jika belum dibayar saat invoice expired
      else if (event === "EXPIRED" && pesanan.status === "MENUNGGU_BAYAR") {
        const updated = await this.prisma.pesananEcom.update({
          where: { id: pesanan.id },
          data: { status: "DIBATALKAN" },
        });

        this.logger.log(
          `Pesanan ${pesanan.id} status updated to DIBATALKAN via Midtrans webhook (Event: EXPIRED)`,
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
}
