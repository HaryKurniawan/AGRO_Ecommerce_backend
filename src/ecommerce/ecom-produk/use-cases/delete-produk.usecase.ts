import { Injectable } from "@nestjs/common";

import { ProdukEcomsRepository } from "../repositories/ecom-produks.repository";
import { FindProductByIdUseCase } from "./find-produk-by-id.usecase";


@Injectable()
export class DeleteProductUseCase {
  constructor(
    private readonly productsRepo: ProdukEcomsRepository,
    private readonly findProductByIdUC: FindProductByIdUseCase,
  ) {}

  async execute(id: string) {
    await this.findProductByIdUC.execute(id);
    const result = await this.productsRepo.delete({ where: { id } });



    return result;
  }
}
