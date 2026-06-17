import { Injectable, NotFoundException } from "@nestjs/common";

import { MasterProdukRepository } from "../repositories/master-produk.repository";

@Injectable()
export class FindOneMasterProdukUseCase {
  constructor(private readonly masterRepo: MasterProdukRepository) {}

  async execute(idOrSlug: string) {
    // Try by ID first, then by slug
    let master = await this.masterRepo.findUnique({
      where: { id: idOrSlug },
      include: {
        kategori: true,
        mappingGudang: true,
      },
    });

    if (!master) {
      master = await this.masterRepo.findUnique({
        where: { slug: idOrSlug },
        include: {
          kategori: true,
          mappingGudang: true,
        },
      });
    }

    if (!master) {
      throw new NotFoundException("Master produk tidak ditemukan.");
    }

    return master;
  }
}
