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

    // 2. Normalisasi Payload (karena Invoice, FVA, QRIS, EWallet strukturnya berbeda)
    let externalId = "";
    let isPaid = false;
    let event = ""; // Defined event variable

    // A. Format FVA (Virtual Account) -> tidak ada status, kalau dipanggil artinya terbayar
    if (payload.callback_virtual_account_id) {
      externalId = payload.external_id as string;
      isPaid = true;
      event = "PAID";
    }
    // B. Format E-Wallet & QRIS (v2 API webhook) -> dibungkus dalam "data"
    else if (payload.event === "ewallet.capture" || payload.event === "qr.payment") {
      const data = payload.data as any;
      externalId = (data.reference_id || data.external_id) as string;
      isPaid = data.status === "SUCCEEDED";
      event = isPaid ? "PAID" : data.status;
    }
    // C. Format Invoice (lama)
    else if (payload.status) {
      externalId = payload.external_id as string;
      isPaid = payload.status === "PAID" || payload.status === "SETTLED";
      event = payload.status as string;
    }

    if (!externalId) {
      this.logger.warn("Webhook ignored: Missing externalId/reference_id in payload");
      return { message: "Webhook ignored - No ID" };
    }

    this.logger.log(`Xendit webhook processed: externalId=${externalId}, isPaid=${isPaid}, event=${event}`);

    if (!isPaid && event !== "EXPIRED") {
      this.logger.log(`Skipping event because it is not a success payment event or expired.`);
      return { message: "Event ignored" };
    }

    // 3. Cari semua pesanan berdasarkan paymentId (externalId)
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
}
