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

    if (pesanan.status === "MENUNGGU_BAYAR") {
      const expiry = new Date(pesanan.createdAt).getTime() + 1 * 60 * 60 * 1000;
      if (Date.now() > expiry) {
        await this.ordersRepo.update({
          where: { id: pesanan.id },
          data: { status: "DIBATALKAN", catatan: "Dibatalkan otomatis karena batas waktu pembayaran habis" },
        });
        pesanan.status = "DIBATALKAN" as any;
        pesanan.catatan = "Dibatalkan otomatis karena batas waktu pembayaran habis";
      }
    }

    return pesanan;
  }
}
