import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";

import { PesananEcomsRepository } from "../repositories/ecom-pesanans.repository";
import { FindOrderByIdUseCase } from "./find-pesanan-by-id.usecase";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { EmailService } from "../../../common/services/email.service";

@Injectable()
export class UpdateShippingStatusUseCase {
  constructor(
    private readonly ordersRepo: PesananEcomsRepository,
    private readonly findOrderById: FindOrderByIdUseCase,
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async execute(
    pesananId: string,
    data: {
      note?: string;
      kurirPenggunaId?: string;
      kurirName?: string;
      kurirPhone?: string;
      sendEmailNotification?: boolean;
    },
  ) {
    const pesanan = await this.findOrderById.execute(pesananId);
    const pengiriman = (pesanan as any).pengiriman;
    if (!pengiriman) {
      throw new NotFoundException(
        "Pengiriman belum diinisialisasi untuk pesanan ini",
      );
    }

    const nextStatus = this.getNextShippingStatus(pengiriman.status as string);
    if (!nextStatus) {
      throw new BadRequestException(
        `Status sudah pada tahap akhir (${pengiriman.status as string}). Tunggu konfirmasi pelanggan.`,
      );
    }

    const history = Array.isArray(pengiriman.trackingHistory)
      ? pengiriman.trackingHistory
      : [];
    history.push({
      status: nextStatus,
      label: this.getStatusLabel(nextStatus),
      timestamp: new Date().toISOString(),
      note: data.note || "",
    });

    const updatedShipping = await this.ordersRepo.updateShipping({
      where: { pesananId },
      data: {
        status: nextStatus,
        trackingHistory: history,
        ...(data.kurirPenggunaId && {
          kurirPenggunaId: data.kurirPenggunaId,
          kurirNama: data.kurirName,
          kurirTelepon: data.kurirPhone,
        }),
      },
    });

    // If sendEmailNotification is true and we have a courier assigned
    if (data.sendEmailNotification) {
      const courierId = data.kurirPenggunaId || pengiriman.kurirPenggunaId;
      if (courierId) {
        const courier = await this.prisma.pengguna.findUnique({
          where: { id: courierId },
        });
        if (courier && courier.email) {
          await this.emailService.sendCourierTaskNotification(
            courier.email,
            courier.nama || "Kurir Toko",
            pesananId,
            data.note,
          );
        }
      }
    }

    // ONLY when status is IN_TRANSIT → pesanan status becomes DIKIRIM (User sees "Sedang Dikirim")
    if (nextStatus === "IN_TRANSIT") {
      await this.ordersRepo.update({
        where: { id: pesananId },
        data: { status: "DIKIRIM" },
      });
    }

    // When status is ARRIVED (Sampai Tujuan) → send order arrived email to consumer
    if (nextStatus === "ARRIVED") {
      const email = (pesanan as any).konsumen?.email;
      const nama = (pesanan as any).konsumen?.nama || "Pelanggan";
      if (email) {
        await this.emailService.sendOrderArrivedNotification(
          email,
          nama,
          pesananId,
        );
      }
    }

    // Emit event for real-time SSE
    this.eventEmitter.emit("order.status.updated", {
      orderId: pesananId,
      shippingStatus: nextStatus,
      tokoId: (pesanan as any).tokoId,
    });

    return updatedShipping;
  }

  private getNextShippingStatus(currentStatus: string) {
    switch (currentStatus) {
      case "PREPARING":
        return "PICKUP_CONFIRMATION";
      case "PICKUP_CONFIRMATION":
        return "PICKED_UP";
      case "PICKED_UP":
        return "IN_TRANSIT";
      case "IN_TRANSIT":
        return "ARRIVED";
      default:
        return null;
    }
  }

  private getStatusLabel(status: string) {
    switch (status) {
      case "PICKUP_CONFIRMATION":
        return "Diserahkan ke Kurir";
      case "PICKED_UP":
        return "Diterima & Dikonfirmasi Kurir";
      case "IN_TRANSIT":
        return "Sedang Dikirim";
      case "ARRIVED":
        return "Sampai Tujuan";
      default:
        return "";
    }
  }
}
