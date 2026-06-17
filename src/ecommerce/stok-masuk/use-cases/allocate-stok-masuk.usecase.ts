import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";

import { StokMasukRepository } from "../stok-masuk.repository";

@Injectable()
export class AllocateStokMasukUseCase {
  constructor(private stokMasukRepository: StokMasukRepository) {}

  async execute(batchId: string, qty: number) {
    if (qty <= 0) {
      throw new BadRequestException(
        "Jumlah yang dialokasikan harus lebih dari 0",
      );
    }

    const batch = await this.stokMasukRepository.findById(batchId);
    if (!batch) {
      throw new NotFoundException(`Batch dengan ID ${batchId} tidak ditemukan`);
    }

    if (batch.jumlahTersisa < qty) {
      throw new BadRequestException(
        `Stok batch tidak mencukupi. Tersedia: ${batch.jumlahTersisa}, Dibutuhkan: ${qty}`,
      );
    }

    return this.stokMasukRepository.decrementBatchStock(batchId, qty);
  }
}
