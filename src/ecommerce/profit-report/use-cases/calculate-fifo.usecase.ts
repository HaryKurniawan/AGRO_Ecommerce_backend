import { Injectable, BadRequestException } from "@nestjs/common";

import { StokMasukService } from "../../stok-masuk/stok-masuk.service";

export interface BatchAllocation {
  batchId: string;
  jumlahDigunakan: number;
  hargaBeli: number;
  totalHargaBeli: number;
}

export interface FIFOResult {
  totalHargaBeli: number;
  hargaBeliRataRata: number;
  batchAllocations: BatchAllocation[];
}

@Injectable()
export class CalculateFifoUseCase {
  constructor(private stokMasukService: StokMasukService) {}

  async execute(
    produkId: string,
    jumlahDibutuhkan: number,
  ): Promise<FIFOResult> {
    // 1. Get available batches (FIFO: oldest first)
    const batches =
      await this.stokMasukService.findAvailableStockBatches(produkId);

    // 2. Check if sufficient stock is available
    const totalStokTersedia = batches.reduce(
      (sum, batch) => sum + batch.jumlahTersisa,
      0,
    );

    if (totalStokTersedia < jumlahDibutuhkan) {
      throw new BadRequestException(
        `Stok tidak mencukupi. Tersedia: ${totalStokTersedia} kg, Dibutuhkan: ${jumlahDibutuhkan} kg`,
      );
    }

    // 3. Allocate from oldest batches
    let remainingQty = jumlahDibutuhkan;
    let totalHargaBeli = 0;
    const batchAllocations: BatchAllocation[] = [];

    for (const batch of batches) {
      if (remainingQty <= 0) break;

      const qtyFromBatch = Math.min(remainingQty, batch.jumlahTersisa);
      const hargaBeliFromBatch = qtyFromBatch * batch.hargaBeli;

      batchAllocations.push({
        batchId: batch.id,
        jumlahDigunakan: qtyFromBatch,
        hargaBeli: batch.hargaBeli,
        totalHargaBeli: hargaBeliFromBatch,
      });

      totalHargaBeli += hargaBeliFromBatch;
      remainingQty -= qtyFromBatch;
    }

    // 4. Calculate weighted average
    const hargaBeliRataRata = totalHargaBeli / jumlahDibutuhkan;

    return {
      totalHargaBeli,
      hargaBeliRataRata,
      batchAllocations,
    };
  }
}
