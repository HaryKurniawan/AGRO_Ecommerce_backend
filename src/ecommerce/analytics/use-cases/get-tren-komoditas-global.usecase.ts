import { Injectable } from "@nestjs/common";

import {
  TrenKomoditasGlobalFilterDto,
  TrenKomoditasGlobalResponse,
} from "../dto/tren-komoditas-global.dto";
import { GetTrenKomoditasGlobalQuery } from "../queries/get-tren-komoditas-global.query";

@Injectable()
export class GetTrenKomoditasGlobalUseCase {
  constructor(private readonly query: GetTrenKomoditasGlobalQuery) {}

  async execute(
    filters: TrenKomoditasGlobalFilterDto,
  ): Promise<TrenKomoditasGlobalResponse> {
    return this.query.execute(filters);
  }
}
