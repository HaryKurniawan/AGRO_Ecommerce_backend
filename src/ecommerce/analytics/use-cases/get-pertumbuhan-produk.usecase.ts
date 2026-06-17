import { Injectable } from "@nestjs/common";

import { PertumbuhanProdukFilterDto } from "../dto/produk-terlaris-filter.dto";
import { GetPertumbuhanProdukQuery } from "../queries/get-pertumbuhan-produk.query";

@Injectable()
export class GetPertumbuhanProdukUseCase {
  constructor(private readonly query: GetPertumbuhanProdukQuery) {}

  async execute(filters: PertumbuhanProdukFilterDto) {
    return this.query.execute(filters);
  }
}
