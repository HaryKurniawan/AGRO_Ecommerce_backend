import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";

import { StokMasukRepository } from "../stok-masuk.repository";

@Injectable()
export class ReturnStokMasukUseCase {
  constructor(private stokMasukRepository: StokMasukRepository) {}

  async execute(batchId: string, qty: number) {
    if (qty <= 0) {
      throw new BadRequestException(
        "Jumlah yang dikembalikan harus lebih dari 0",
      );
    }

    const batch = await this.stokMasukRepository.findById(batchId);
    if (!batch) {
      throw new NotFoundException(`Batch dengan ID ${batchId} tidak ditemukan`);
    }

    return this.stokMasukRepository.incrementBatchStock(batchId, qty);
  }
}
