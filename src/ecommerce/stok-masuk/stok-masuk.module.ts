import { Module } from "@nestjs/common";

import { PrismaModule } from "../../infrastructure/database/prisma.module";
import { StokMasukService } from "./stok-masuk.service";
import { StokMasukRepository } from "./stok-masuk.repository";
import { CreateStokMasukUseCase } from "./use-cases/create-stok-masuk.usecase";
import { AllocateStokMasukUseCase } from "./use-cases/allocate-stok-masuk.usecase";
import { ReturnStokMasukUseCase } from "./use-cases/return-stok-masuk.usecase";
import { CheckStockAvailabilityUseCase } from "./use-cases/check-stock-availability.usecase";
import { ProcessStockInFromPengajuanUseCase } from "./use-cases/process-stock-in-from-pengajuan.usecase";
import {
  FindAvailableStockBatchesUseCase,
  UpdateBatchStockUseCase,
} from "./use-cases/batch-stock.usecase";

@Module({
  imports: [PrismaModule],
  providers: [
    StokMasukRepository,
    CreateStokMasukUseCase,
    AllocateStokMasukUseCase,
    ReturnStokMasukUseCase,
    CheckStockAvailabilityUseCase,
    ProcessStockInFromPengajuanUseCase,
    FindAvailableStockBatchesUseCase,
    UpdateBatchStockUseCase,
    StokMasukService,
  ],
  exports: [StokMasukService],
})
export class StokMasukModule {}
