import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";

import { StokMasukRepository } from "../stok-masuk.repository";

@Injectable()
export class FindAvailableStockBatchesUseCase {
  constructor(private stokMasukRepository: StokMasukRepository) {}

  async execute(produkId: string) {
    if (!produkId) {
      throw new BadRequestException("Product ID is required");
    }

    return this.stokMasukRepository.findAvailableStockBatches(produkId);
  }
}

@Injectable()
export class UpdateBatchStockUseCase {
  constructor(private stokMasukRepository: StokMasukRepository) {}

  async execute(batchId: string, newQty: number) {
    if (newQty < 0) {
      throw new BadRequestException("Jumlah stok tidak boleh negatif");
    }

    const batch = await this.stokMasukRepository.findById(batchId);
    if (!batch) {
      throw new NotFoundException(`Batch dengan ID ${batchId} tidak ditemukan`);
    }

    return this.stokMasukRepository.updateBatchStock(batchId, newQty);
  }
}
