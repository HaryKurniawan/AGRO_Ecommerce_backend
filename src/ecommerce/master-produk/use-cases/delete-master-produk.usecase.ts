import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";

import { MasterProdukRepository } from "../repositories/master-produk.repository";

@Injectable()
export class DeleteMasterProdukUseCase {
  constructor(private readonly masterRepo: MasterProdukRepository) {}

  async execute(id: string) {
    const existing = await this.masterRepo.findUnique({
      where: { id },
      include: {
        produkEcoms: { select: { id: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException("Master produk tidak ditemukan.");
    }

    if (existing.produkEcoms.length > 0) {
      throw new BadRequestException(
        `Tidak dapat menghapus master produk ini karena masih digunakan oleh ${existing.produkEcoms.length} produk seller.`,
      );
    }

    return this.masterRepo.delete({
      where: { id },
    });
  }
}
