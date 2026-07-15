import { Injectable } from "@nestjs/common";

import { PesananEcomsRepository } from "../repositories/ecom-pesanans.repository";

@Injectable()
export class FindUserOrdersUseCase {
  constructor(private readonly ordersRepo: PesananEcomsRepository) {}

  async execute(penggunaId: string, status?: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where: any = { konsumenId: penggunaId };
    if (status) where.status = status.toUpperCase();

    const [data, total] = await Promise.all([
      this.ordersRepo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          item: {
            include: {
              produk: {
                include: {
                  toko: { select: { id: true, nama: true, fotoUrl: true } },
                },
              },
            },
          },
          pengiriman: true,
        },
      }),
      this.ordersRepo.count({ where }),
    ]);

    const now = Date.now();
    for (const pesanan of data) {
      if (pesanan.status === "MENUNGGU_BAYAR") {
        const expiry = new Date(pesanan.createdAt).getTime() + 1 * 60 * 60 * 1000;
        if (now > expiry) {
          await this.ordersRepo.update({
            where: { id: pesanan.id },
            data: { status: "DIBATALKAN", catatan: "Dibatalkan otomatis karena batas waktu pembayaran habis" },
          });
          pesanan.status = "DIBATALKAN" as any;
          pesanan.catatan = "Dibatalkan otomatis karena batas waktu pembayaran habis";
        }
      }
    }

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
