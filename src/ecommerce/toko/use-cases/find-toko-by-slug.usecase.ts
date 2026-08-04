import { Injectable, NotFoundException } from "@nestjs/common";

import { TokosRepository } from "../repositories/tokos.repository";

@Injectable()
export class FindStoreBySlugUseCase {
  constructor(private readonly storesRepo: TokosRepository) {}

  async execute(slug: string) {
    const toko = await this.storesRepo.findUnique({
      where: { slug },
      include: {
        produk: {
          where: { status: "ACTIVE" },
          take: 20,
          include: {
            kategori: { select: { id_kategoriToko: true, nama: true } },
          },
        },
      },
    });

    if (!toko) throw new NotFoundException("Toko not found");

    // Map fields for frontend compatibility
    return {
      ...toko,
      id: toko.id_toko,
      foto: toko.fotoUrl,
      banner: toko.bannerUrl,
    };
  }
}
