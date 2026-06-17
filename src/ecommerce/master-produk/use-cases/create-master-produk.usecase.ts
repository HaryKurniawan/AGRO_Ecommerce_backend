import { Injectable, BadRequestException } from "@nestjs/common";

import { MasterProdukRepository } from "../repositories/master-produk.repository";
import { CreateMasterProdukDto } from "../dto/create-master-produk.dto";

@Injectable()
export class CreateMasterProdukUseCase {
  constructor(private readonly masterRepo: MasterProdukRepository) {}

  async execute(dto: CreateMasterProdukDto) {
    const slug = dto.nama
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    // Check if slug or name is unique
    const existing = await this.masterRepo.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new BadRequestException(
        "Master produk dengan nama tersebut sudah ada.",
      );
    }

    const existingName = await this.masterRepo.findUnique({
      where: { nama: dto.nama },
    });

    if (existingName) {
      throw new BadRequestException(
        "Master produk dengan nama tersebut sudah ada.",
      );
    }

    // Set namaWajibMengandung default if not specified
    const namaWajibMengandung = dto.namaWajibMengandung || dto.nama;

    return this.masterRepo.create({
      data: {
        ...dto,
        slug,
        namaWajibMengandung,
      },
      include: {
        kategori: true,
      },
    });
  }
}
