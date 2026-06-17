import { Injectable } from "@nestjs/common";

import { ProdukEcomsRepository } from "../repositories/ecom-produks.repository";
import { FindProductByIdUseCase } from "./find-produk-by-id.usecase";

@Injectable()
export class UpdateProductStatusUseCase {
  constructor(
    private readonly productsRepo: ProdukEcomsRepository,
    private readonly findProductByIdUC: FindProductByIdUseCase,
  ) {}

  async execute(
    id: string,
    status: "DRAFT" | "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK",
  ) {
    await this.findProductByIdUC.execute(id);
    return this.productsRepo.update({
      where: { id },
      data: { status },
      include: {
        kategori: { select: { id: true, nama: true } },
        toko: { select: { id: true, nama: true } },
      },
    });
  }
}
