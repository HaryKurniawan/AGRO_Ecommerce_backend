import { Injectable, BadRequestException } from "@nestjs/common";

import { PesananEcomsRepository } from "../repositories/ecom-pesanans.repository";
import { FindOrderByIdUseCase } from "./find-pesanan-by-id.usecase";

@Injectable()
export class ConfirmReceivedUseCase {
  constructor(
    private readonly ordersRepo: PesananEcomsRepository,
    private readonly findOrderById: FindOrderByIdUseCase,
  ) {}

  async execute(pesananId: string, penggunaId: string) {
    const pesanan = await this.findOrderById.execute(pesananId);

    if (pesanan.konsumenId !== penggunaId) {
      throw new BadRequestException(
        "Anda tidak berhak mengkonfirmasi pesanan ini",
      );
    }
    if ((pesanan as any).pengiriman?.status !== "ARRIVED") {
      throw new BadRequestException(
        "Barang belum dinyatakan tiba oleh penjual",
      );
    }
    if (pesanan.status === "SELESAI") {
      throw new BadRequestException("Pesanan sudah selesai");
    }

    return this.ordersRepo.update({
      where: { id: pesananId },
      data: { status: "SELESAI" },
    });
  }
}
