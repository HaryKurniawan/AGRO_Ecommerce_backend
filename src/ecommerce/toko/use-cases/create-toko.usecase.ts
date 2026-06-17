import { Injectable, ForbiddenException } from "@nestjs/common";

import { TokosRepository } from "../repositories/tokos.repository";
import { CreateStoreDto } from "../dto/create-toko.dto";

@Injectable()
export class CreateStoreUseCase {
  constructor(private readonly storesRepo: TokosRepository) {}

  async execute(penjualId: string, dto: CreateStoreDto) {
    const profilPenjual =
      await this.storesRepo.findSellerProfileByUserId(penjualId);

    if (!profilPenjual) {
      throw new ForbiddenException("Pengguna does not have a penjual profile");
    }

    const slug = dto.nama
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    return this.storesRepo.create({
      data: {
        penjual: { connect: { id: profilPenjual.id } },
        nama: dto.nama,
        slug,
        kabupaten: dto.kabupaten,
        wilayah: dto.wilayah,
        deskripsi: dto.deskripsi,
        alamat: dto.alamat,
        telepon: dto.telepon,
        jamOperasional: dto.jamOperasional,
        fotoUrl: dto.fotoUrl,
        bannerUrl: dto.bannerUrl,
        komoditasUnggulan: dto.komoditasUnggulan ?? [],
      },
      include: { penjual: { select: { namaToko: true } } },
    });
  }
}
