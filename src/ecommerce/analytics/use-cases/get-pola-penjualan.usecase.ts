import { Injectable } from "@nestjs/common";

import { PolaPenjualanFilterDto } from "../dto/produk-terlaris-filter.dto";
import { GetPolaPenjualanQuery } from "../queries/get-pola-penjualan.query";

@Injectable()
export class GetPolaPenjualanUseCase {
  constructor(private readonly query: GetPolaPenjualanQuery) {}

  async execute(filters: PolaPenjualanFilterDto) {
    return this.query.execute(filters);
  }
}
