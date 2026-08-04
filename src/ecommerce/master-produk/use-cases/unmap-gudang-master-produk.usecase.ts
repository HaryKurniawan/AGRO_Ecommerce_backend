import { Injectable, NotFoundException } from "@nestjs/common";

import { MasterProdukRepository } from "../repositories/master-produk.repository";

@Injectable()
export class UnmapGudangMasterProdukUseCase {
  constructor(private readonly masterRepo: MasterProdukRepository) {}

  async execute(masterId: string, mappingId: string) {
    // Check if mapping exists
    const mappings = await this.masterRepo.findManyMappings({
      where: {
        id_mappingProdukGudang: mappingId,
        masterProdukId: masterId,
      },
    });

    if (mappings.length === 0) {
      throw new NotFoundException("Pemetaan tidak ditemukan.");
    }

    return this.masterRepo.deleteMapping({
      where: { id_mappingProdukGudang: mappingId },
    });
  }
}
