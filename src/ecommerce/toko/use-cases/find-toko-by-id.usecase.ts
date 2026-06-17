import { Injectable, NotFoundException } from "@nestjs/common";

import { TokosRepository } from "../repositories/tokos.repository";

@Injectable()
export class FindStoreByIdUseCase {
  constructor(private readonly storesRepo: TokosRepository) {}

  async execute(id: string) {
    const toko = await this.storesRepo.findUnique({
      where: { id },
      include: {
        produk: {
          where: { status: "ACTIVE" },
          take: 20,
          include: {
            kategori: { select: { id: true, nama: true } },
          },
        },
        penjual: {
          include: {
            kurir: true,
          },
        },
      },
    });

    if (!toko) throw new NotFoundException("Toko not found");

    // Map fields for frontend compatibility
    return {
      ...toko,
      foto: toko.fotoUrl,
      banner: toko.bannerUrl,
      courierStaff: toko.penjual?.kurir ? { name: toko.penjual.kurir.nama } : undefined,
    };
  }
}
