import { Injectable, BadRequestException } from "@nestjs/common";

import { TokosRepository } from "../repositories/tokos.repository";
import { ProdukEcomsRepository } from "../../ecom-produk/repositories/ecom-produks.repository";

@Injectable()
export class GetTokoStockHistoryUseCase {
  constructor(
    private readonly tokosRepo: TokosRepository,
    private readonly productsRepo: ProdukEcomsRepository,
  ) {}

  async execute(penggunaId: string, page = 1, limit = 20) {
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

    const stokQuery = {
      where: {
        produk: {
          tokoId: toko.id,
        },
      },
    };

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.productsRepo.findManyStockHistory({
        ...stokQuery,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          produk: { select: { id: true, nama: true, gambarUrl: true } },
          pengguna: { select: { id: true, nama: true, peran: true } },
          pesanan: {
            select: {
              id: true,
              status: true,
              konsumen: { select: { id: true, nama: true } },
            },
          },
        },
      }),
      this.productsRepo.countStockHistory(stokQuery),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
