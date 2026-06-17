import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";

import { MasterProdukRepository } from "../repositories/master-produk.repository";
import { UpdateMasterProdukDto } from "../dto/update-master-produk.dto";

@Injectable()
export class UpdateMasterProdukUseCase {
  constructor(private readonly masterRepo: MasterProdukRepository) {}

  async execute(id: string, dto: UpdateMasterProdukDto) {
    const existing = await this.masterRepo.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException("Master produk tidak ditemukan.");
    }

    const updateData: any = { ...dto };

    if (dto.nama && dto.nama !== existing.nama) {
      const slug = dto.nama
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

      // Check collision
      const collision = await this.masterRepo.findUnique({
        where: { slug },
      });

      if (collision && collision.id !== id) {
        throw new BadRequestException(
          "Master produk dengan nama tersebut sudah ada.",
        );
      }

      const collisionName = await this.masterRepo.findUnique({
        where: { nama: dto.nama },
      });

      if (collisionName && collisionName.id !== id) {
        throw new BadRequestException(
          "Master produk dengan nama tersebut sudah ada.",
        );
      }

      updateData.slug = slug;
      if (!dto.namaWajibMengandung) {
        updateData.namaWajibMengandung = dto.nama;
      }
    }

    return this.masterRepo.update({
      where: { id },
      data: updateData,
      include: {
        kategori: true,
      },
    });
  }
}
