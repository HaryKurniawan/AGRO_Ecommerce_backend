import { Injectable } from "@nestjs/common";

import { ProdukEcomsRepository } from "../repositories/ecom-produks.repository";

@Injectable()
export class FindProductsByStoreUseCase {
  constructor(private readonly productsRepo: ProdukEcomsRepository) {}

  async execute(tokoId: string, page = 1, limit = 100, activeOnly = true, search?: string, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = { tokoId };
    if (activeOnly) {
      where.status = "ACTIVE";
    } else if (status && status !== "semua") {
      if (status === "active") where.status = "ACTIVE";
      else if (status === "inactive") where.status = "INACTIVE";
      else if (status === "draft") where.status = "DRAFT";
      else if (status === "out_of_stock") where.stok = { lte: 0 }; // custom case if handled here
    }

    if (search) {
      where.nama = { contains: search }; // assuming MySQL/MariaDB or default insensitive in Postgres
    }

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
