import { Injectable, BadRequestException } from "@nestjs/common";

import { StokMasukRepository } from "../stok-masuk.repository";

@Injectable()
export class CheckStockAvailabilityUseCase {
  constructor(private stokMasukRepository: StokMasukRepository) {}

  async execute(produkId: string, requiredQty: number) {
    if (!produkId) {
      throw new BadRequestException("Product ID is required");
    }

    const totalAvailable =
      await this.stokMasukRepository.getTotalAvailableStock(produkId);
    return totalAvailable >= requiredQty;
  }

  async getTotalAvailable(produkId: string) {
    if (!produkId) {
      throw new BadRequestException("Product ID is required");
    }
    return this.stokMasukRepository.getTotalAvailableStock(produkId);
  }
}
