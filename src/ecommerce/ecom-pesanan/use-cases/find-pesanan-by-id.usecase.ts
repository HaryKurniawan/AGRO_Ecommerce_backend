import { Injectable, NotFoundException } from "@nestjs/common";

import { PesananEcomsRepository } from "../repositories/ecom-pesanans.repository";

@Injectable()
export class FindOrderByIdUseCase {
  constructor(private readonly ordersRepo: PesananEcomsRepository) {}

  async execute(id: string) {
    const pesanan = await this.ordersRepo.findUnique({
      where: { id },
      include: {
        item: {
          include: {
            produk: {
              include: { toko: { select: { id: true, nama: true } } },
            },
          },
        },
        konsumen: {
          select: {
            nama: true,
            email: true,
            noTelepon: true,
            addresses: {
              where: { isDefault: true },
              take: 1,
            },
          },
        },
        pengiriman: true,
      },
    });
    if (!pesanan) throw new NotFoundException("Pesanan not found");
    return pesanan;
  }
}
