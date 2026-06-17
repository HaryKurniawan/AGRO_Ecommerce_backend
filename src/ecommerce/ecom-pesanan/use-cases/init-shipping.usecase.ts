import { Injectable, BadRequestException } from "@nestjs/common";

import { PesananEcomsRepository } from "../repositories/ecom-pesanans.repository";
import { FindOrderByIdUseCase } from "./find-pesanan-by-id.usecase";
import { PrismaService } from "../../../infrastructure/database/prisma.service";

import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class InitShippingUseCase {
  constructor(
    private readonly ordersRepo: PesananEcomsRepository,
    private readonly findOrderById: FindOrderByIdUseCase,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    pesananId: string,
    data: {
      kurirPenggunaId?: string;
      kurirName?: string;
      kurirPhone?: string;
      catatan?: string;
    },
  ) {
    const pesanan = await this.findOrderById.execute(pesananId);
    if (pesanan.status !== "DIPROSES") {
      throw new BadRequestException(
        "Pesanan harus berstatus DIPROSES sebelum bisa diproses pengiriman",
      );
    }
    if ((pesanan as any).pengiriman) {
      throw new BadRequestException(
        "Pengiriman sudah diinisialisasi untuk pesanan ini",
      );
    }

    // Auto-assign affiliated courier from the store if not manually specified
    let finalCourierPenggunaId = data.kurirPenggunaId;
    let finalCourierName = data.kurirName;
    let finalCourierPhone = data.kurirPhone;

    if (!finalCourierPenggunaId) {
      // Find the toko from the first item in the order
      const orderWithItems = await this.prisma.pesananEcom.findUnique({
        where: { id: pesananId },
        include: {
          item: {
            include: {
              produk: {
                include: {
                  toko: true,
                },
              },
            },
          },
        },
      });

      const firstToko = orderWithItems?.item?.[0]?.produk?.toko as any;
      if (firstToko?.courierStaffId) {
        finalCourierPenggunaId = firstToko.courierStaffId;
        // Fetch courier profile
        const courierProfile = await this.prisma.pengguna.findUnique({
          where: { id: firstToko.courierStaffId },
        });
        finalCourierName = courierProfile?.nama || "Kurir Toko";
        finalCourierPhone = courierProfile?.noTelepon || undefined;
      }
    }

    const pengiriman = await this.ordersRepo.createShipping({
      data: {
        pesananId,
        kurirPenggunaId: finalCourierPenggunaId,
        kurirNama: finalCourierName,
        kurirTelepon: finalCourierPhone,
        catatan: data.catatan,
        status: "PREPARING",
        trackingHistory: [
          {
            status: "PREPARING",
            label: "Sedang Disiapkan",
            timestamp: new Date().toISOString(),
            note: data.catatan || "Pesanan sedang disiapkan oleh penjual",
          },
        ],
      },
    });

    // Update pesanan status to DIPROSES (re-confirming stage)
    await this.ordersRepo.update({
      where: { id: pesananId },
      data: { status: "DIPROSES" },
    });

    // Emit event for real-time SSE
    this.eventEmitter.emit("order.status.updated", {
      orderId: pesananId,
      status: "DIPROSES",
      shippingStatus: "PREPARING",
      tokoId: (pesanan as any).tokoId,
    });

    return pengiriman;
  }
}
