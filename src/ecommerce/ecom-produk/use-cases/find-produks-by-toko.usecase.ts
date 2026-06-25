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
          kategori: { select: { id: true, nama: true } },
          toko: { select: { id: true, nama: true } },
          masterProduk: {
            select: {
              id: true,
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
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
