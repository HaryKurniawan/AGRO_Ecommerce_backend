import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";

import { MasterProdukRepository } from "../repositories/master-produk.repository";
import { CreateMappingDto } from "../dto/create-mapping.dto";

@Injectable()
export class MapGudangMasterProdukUseCase {
  constructor(private readonly masterRepo: MasterProdukRepository) {}

  async execute(masterId: string, dto: CreateMappingDto) {
    // 1. Verify master product exists
    const master = await this.masterRepo.findUnique({
      where: { id: masterId },
    });

    if (!master) {
      throw new NotFoundException("Master produk tidak ditemukan.");
    }

    // 2. Check if mapping already exists
    const existing = await this.masterRepo.findUniqueMapping({
      where: {
        masterProdukId_produkGudangId: {
          masterProdukId: masterId,
          produkGudangId: dto.produkGudangId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        "Produk gudang ini sudah dipetakan ke master produk ini.",
      );
    }

    // 3. Create mapping
    return this.masterRepo.createMapping({
      data: {
        masterProdukId: masterId,
        produkGudangId: dto.produkGudangId,
        gudangId: dto.gudangId,
        gudangNama: dto.gudangNama,
      },
    });
  }
}
