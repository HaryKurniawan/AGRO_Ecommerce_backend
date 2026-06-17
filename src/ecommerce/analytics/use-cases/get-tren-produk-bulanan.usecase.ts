import { Injectable } from "@nestjs/common";

import { TrenProdukBulananFilterDto } from "../dto/produk-terlaris-filter.dto";
import { GetTrenProdukBulananQuery } from "../queries/get-tren-produk-bulanan.query";

@Injectable()
export class GetTrenProdukBulananUseCase {
  constructor(private readonly query: GetTrenProdukBulananQuery) {}

  async execute(filters: TrenProdukBulananFilterDto) {
    return this.query.execute(filters);
  }
}
