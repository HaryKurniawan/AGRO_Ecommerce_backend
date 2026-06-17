import { Injectable } from "@nestjs/common";

import { ProdukEcomsRepository } from "../repositories/ecom-produks.repository";
import { FindProductByIdUseCase } from "./find-produk-by-id.usecase";

@Injectable()
export class GetStockHistoryUseCase {
  constructor(
    private readonly productsRepo: ProdukEcomsRepository,
    private readonly findProductByIdUC: FindProductByIdUseCase,
  ) {}

  async execute(produkId: string, page = 1, limit = 20) {
    await this.findProductByIdUC.execute(produkId);
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.productsRepo.findManyStockHistory({
        where: { produkId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          pengguna: { select: { id: true, nama: true, peran: true } },
        },
      }),
      this.productsRepo.countStockHistory({
        where: { produkId },
      }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
