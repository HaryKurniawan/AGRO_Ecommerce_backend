import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PesananEcomsRepository } from "../repositories/ecom-pesanans.repository";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { StatusPesananEcom } from "@prisma/client";

@Injectable()
export class SellerConfirmOrderUseCase {
  constructor(
    private readonly ordersRepo: PesananEcomsRepository,
    private readonly prisma: PrismaService
  ) {}

  async execute(pesananId: string) {
    const pesanan = await this.ordersRepo.findUnique({
      where: { id_pesanan: pesananId },
    });

    if (!pesanan) {
      throw new NotFoundException("Pesanan tidak ditemukan");
    }

    if (pesanan.status !== "SELESAI") {
      throw new BadRequestException(
        "Hanya pesanan berstatus SELESAI (sudah dikonfirmasi pembeli) yang dapat ditutup oleh seller",
      );
    }

    const updated = await this.ordersRepo.update({
      where: { id_pesanan: pesananId },
      data: { status: StatusPesananEcom.DITUTUP },
    });

    try {
      await this.prisma.transaksiKeuntungan.updateMany({
        where: { pesananId },
        data: { statusPesanan: StatusPesananEcom.DITUTUP },
      });
    } catch (_error) {
      // ignore
    }

    return updated;
  }
}
