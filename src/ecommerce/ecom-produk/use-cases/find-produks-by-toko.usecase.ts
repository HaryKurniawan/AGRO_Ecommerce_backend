import { Injectable } from "@nestjs/common";

import { ProdukEcomsRepository } from "../repositories/ecom-produks.repository";

@Injectable()
export class FindProductsByStoreUseCase {
  constructor(private readonly productsRepo: ProdukEcomsRepository) {}

  async execute(tokoId: string, page = 1, limit = 100, activeOnly = true) {
    const skip = (page - 1) * limit;
    const where: any = { tokoId };
    if (activeOnly) where.status = "ACTIVE";

    const [data, total] = await Promise.all([
      this.productsRepo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          kategori: { select: { id_kategoriToko: true, nama: true } },
          toko: { select: { id_toko: true, nama: true } },
          masterProduk: {
            select: {
              id_masterProduk: true,
              nama: true,
              allowCustomName: true,
              namaWajibMengandung: true,
            },
          },
          varian: true,
        },
      }),
      this.productsRepo.count({ where }),
    ]);

    const mappedData = data.map((p: any) => {
      p.id = p.id_produk;
      if (p.varian) {
        p.varian = p.varian.map((v: any) => ({ ...v, id: v.id_varianKemasan }));
      }
      return p;
    });

    return { data: mappedData, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
