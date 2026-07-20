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
import { PerTokoTelegramService } from "../../../core/telegram/per-toko-telegram.service";

@Injectable()
export class ConfirmPaymentUseCase {
  constructor(
    private readonly ordersRepo: PesananEcomsRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly profitReportService: ProfitReportService,
    private readonly perTokoTelegramService: PerTokoTelegramService,
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
      include: {
        toko: { select: { nama: true } },
        konsumen: { select: { nama: true } },
        item: { include: { produk: { select: { nama: true, namaEtalase: true } } } },
      },
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

    // 7. Fire-and-forget: Kirim notif Telegram ke seller
    if (updated.tokoId) {
      const detailProdukText = updated.item?.map(i => {
        const namaProduk = i.produk?.namaEtalase || i.produk?.nama || "Produk";
        return `- ${namaProduk} (${i.jumlah}x)`;
      }).join("\n");

      void (async () => {
        try {
          await this.perTokoTelegramService.sendNewOrderNotif({
            tokoId: updated.tokoId!,
            orderId: updated.id,
            namaToko: updated.toko?.nama || "Toko",
            namaPembeli: updated.konsumen?.nama || "Pembeli",
            totalHarga: Number(updated.totalHarga || 0),
            jumlahItem: updated.item?.length || 0,
            metodeBayar: updated.metodeBayar || "Online",
            detailProdukText,
          });
        } catch (error: any) {
          console.error(
            `Gagal mengirim notifikasi Telegram pesanan ${updated.id}: ${error?.message || error}`
          );
        }
      })();
    }

    return updated;
  }
}
