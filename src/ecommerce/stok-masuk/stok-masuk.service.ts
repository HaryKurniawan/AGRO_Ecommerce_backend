import { Injectable } from "@nestjs/common";
import { StokMasukProduk } from "@prisma/client";

import { CreateStokMasukDto } from "./dto/create-stok-masuk.dto";
import { CreateStokMasukUseCase } from "./use-cases/create-stok-masuk.usecase";
import { AllocateStokMasukUseCase } from "./use-cases/allocate-stok-masuk.usecase";
import { ReturnStokMasukUseCase } from "./use-cases/return-stok-masuk.usecase";
import { CheckStockAvailabilityUseCase } from "./use-cases/check-stock-availability.usecase";
import { ProcessStockInFromPengajuanUseCase } from "./use-cases/process-stock-in-from-pengajuan.usecase";
import {
  FindAvailableStockBatchesUseCase,
  FindAllStockBatchesUseCase,
  UpdateBatchStockUseCase,
} from "./use-cases/batch-stock.usecase";
import { StokMasukRepository } from "./stok-masuk.repository";

@Injectable()
export class StokMasukService {
  constructor(
    private createUC: CreateStokMasukUseCase,
    private allocateUC: AllocateStokMasukUseCase,
    private returnUC: ReturnStokMasukUseCase,
    private checkAvailabilityUC: CheckStockAvailabilityUseCase,
    private processFromPengajuanUC: ProcessStockInFromPengajuanUseCase,
    private findAvailableBatchesUC: FindAvailableStockBatchesUseCase,
    private findAllBatchesUC: FindAllStockBatchesUseCase,
    private stokMasukRepository: StokMasukRepository,
    private updateBatchUC: UpdateBatchStockUseCase,
  ) {}

  async createStokMasuk(data: CreateStokMasukDto): Promise<StokMasukProduk> {
    return this.createUC.execute(data);
  }

  async findAvailableStockBatches(
    produkId: string,
  ): Promise<StokMasukProduk[]> {
    return this.findAvailableBatchesUC.execute(produkId);
  }

  async findAllStockBatches(
    produkId: string,
  ): Promise<StokMasukProduk[]> {
    return this.findAllBatchesUC.execute(produkId);
  }

  async updateBatchStock(
    batchId: string,
    newQty: number,
  ): Promise<StokMasukProduk> {
    return this.updateBatchUC.execute(batchId, newQty);
  }

  async returnStockToBatch(
    batchId: string,
    qty: number,
  ): Promise<StokMasukProduk> {
    return this.returnUC.execute(batchId, qty);
  }

  async allocateStockFromBatches(
    batchId: string,
    qty: number,
  ): Promise<StokMasukProduk> {
    return this.allocateUC.execute(batchId, qty);
  }

  async getTotalAvailableStock(produkId: string): Promise<number> {
    return this.checkAvailabilityUC.getTotalAvailable(produkId);
  }

  async checkStockAvailability(
    produkId: string,
    requiredQty: number,
  ): Promise<boolean> {
    return this.checkAvailabilityUC.execute(produkId, requiredQty);
  }

  async processStockInFromPengajuan(
    pengajuanStokId: string,
    items: Array<{
      id: string;
      produkEcomId: string;
      jumlahDisetujui: number;
      hargaGudang: number;
      ukuranKemasanKg?: number;
      estimasiSegarHari?: number;
    }>,
  ): Promise<StokMasukProduk[]> {
    return this.processFromPengajuanUC.execute(pengajuanStokId, items);
  }

  async updateBatchExpiry(
    batchId: string,
    tanggalKadaluarsa: string | null,
  ): Promise<StokMasukProduk> {
    const parsedDate = tanggalKadaluarsa ? new Date(tanggalKadaluarsa) : null;
    return this.stokMasukRepository.updateBatchExpiry(batchId, parsedDate);
  }
}
