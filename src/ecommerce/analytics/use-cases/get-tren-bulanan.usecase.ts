import { Injectable } from "@nestjs/common";

import { TrenBulananFilterDto } from "../dto/produk-terlaris-filter.dto";
import { GetTrenBulananQuery } from "../queries/get-tren-bulanan.query";

@Injectable()
export class GetTrenBulananUseCase {
  constructor(private readonly query: GetTrenBulananQuery) {}

  async execute(filters: TrenBulananFilterDto) {
    return this.query.execute(filters);
  }
}
