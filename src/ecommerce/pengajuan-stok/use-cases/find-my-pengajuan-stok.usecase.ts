import { Injectable, BadRequestException } from "@nestjs/common";

import { PengajuanStokRepository } from "../repositories/pengajuan-stok.repository";
import { TokosRepository } from "../../toko/repositories/tokos.repository";

@Injectable()
export class FindMyPengajuanStokUseCase {
  constructor(
    private readonly stokRepo: PengajuanStokRepository,
    private readonly tokosRepo: TokosRepository,
  ) {}

  async execute(penggunaId: string) {
    const profil = await this.tokosRepo.findSellerProfileByUserId(penggunaId);
    if (!profil) {
      throw new BadRequestException("Pengguna bukan penjual");
    }

    const toko = await this.tokosRepo.findUnique({
      where: { penjualId: profil.id },
    });

    if (!toko) {
      throw new BadRequestException("Toko tidak ditemukan");
    }

    return this.stokRepo.findMany({
      where: { tokoId: toko.id },
      include: {
        items: true, // ✅ Remove produk include
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
