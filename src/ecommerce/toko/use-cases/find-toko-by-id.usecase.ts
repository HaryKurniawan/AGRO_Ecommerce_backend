import { Injectable, NotFoundException } from "@nestjs/common";

import { TokosRepository } from "../repositories/tokos.repository";

@Injectable()
export class FindStoreByIdUseCase {
  constructor(private readonly storesRepo: TokosRepository) {}

  async execute(id: string) {
    const toko = await this.storesRepo.findUnique({
      where: { id_toko: id },
      include: {
        produk: {
          where: { status: "ACTIVE" },
          take: 20,
          include: {
            kategori: { select: { id_kategoriToko: true, nama: true } },
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

    const totalPenjualan = await this.storesRepo.calculateTotalPenjualan(toko.id_toko);

    // Map fields for frontend compatibility
    return {
      ...toko,
      id: toko.id_toko,
      foto: toko.fotoUrl,
      banner: toko.bannerUrl,
      courierStaff: (toko as any).penjual?.kurir ? { name: (toko as any).penjual.kurir.nama } : undefined,
      totalPenjualan,
    };
  }
}
