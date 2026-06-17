import { Injectable } from "@nestjs/common";

import { GetPesananHarianQuery } from "../queries/get-pesanan-harian.query";

@Injectable()
export class GetPesananHarianUseCase {
  constructor(private readonly query: GetPesananHarianQuery) {}

  async execute(tokoId: string, date: string) {
    return this.query.execute(tokoId, date);
  }
}
