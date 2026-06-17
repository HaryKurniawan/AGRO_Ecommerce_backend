import { Injectable } from "@nestjs/common";

import { RiwayatBulananFilterDto } from "../dto/produk-terlaris-filter.dto";
import { GetRiwayatTerlarisQuery } from "../queries/get-riwayat-terlaris.query";

@Injectable()
export class GetRiwayatTerlarisUseCase {
  constructor(private readonly query: GetRiwayatTerlarisQuery) {}

  async execute(filters: RiwayatBulananFilterDto) {
    return this.query.execute(filters);
  }
}
