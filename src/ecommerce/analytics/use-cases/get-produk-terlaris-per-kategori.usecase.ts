import { Injectable } from "@nestjs/common";

import { ProdukTerlarisFilterDto } from "../dto/produk-terlaris-filter.dto";
import { GetProdukTerlarisPerKategoriQuery } from "../queries/get-produk-terlaris-per-kategori.query";

@Injectable()
export class GetProdukTerlarisPerKategoriUseCase {
  constructor(private readonly query: GetProdukTerlarisPerKategoriQuery) {}

  async execute(filters: ProdukTerlarisFilterDto) {
    return this.query.execute(filters);
  }
}
