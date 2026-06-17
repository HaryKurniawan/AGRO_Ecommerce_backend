import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";

import { PesananEcomsRepository } from "../repositories/ecom-pesanans.repository";

@Injectable()
export class SellerConfirmOrderUseCase {
  constructor(private readonly ordersRepo: PesananEcomsRepository) {}

  async execute(pesananId: string) {
    const pesanan = await this.ordersRepo.findUnique({
      where: { id: pesananId },
    });

    if (!pesanan) {
      throw new NotFoundException("Pesanan tidak ditemukan");
    }

    if (pesanan.status !== "SELESAI") {
      throw new BadRequestException(
        "Hanya pesanan berstatus SELESAI (sudah dikonfirmasi pembeli) yang dapat ditutup oleh seller",
      );
    }

    return this.ordersRepo.update({
      where: { id: pesananId },
      data: { status: "DITUTUP" as any },
    });
  }
}
