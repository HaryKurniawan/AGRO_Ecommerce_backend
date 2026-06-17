import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";

import { PrismaModule } from "../../infrastructure/database/prisma.module";
import { DeliveryBatchScheduler } from "./delivery-batch.scheduler";
import { DeliveryBatchController } from "./delivery-batch.controller";
import { GenerateDeliveryBatchUseCase } from "./use-cases/generate-delivery-batch.usecase";
import { GenerateGlobalDeliveryBatchesUseCase } from "./use-cases/generate-global-delivery-batches.usecase";
import { GetCourierBatchesUseCase } from "./use-cases/get-courier-batches.usecase";
import { GetStoreBatchesUseCase } from "./use-cases/get-store-batches.usecase";
import { StartDeliveryBatchUseCase } from "./use-cases/start-delivery-batch.usecase";
import { MarkDeliveryItemDeliveredUseCase } from "./use-cases/mark-delivery-item-delivered.usecase";
import { GetDeliveryBatchDetailUseCase } from "./use-cases/get-delivery-batch-detail.usecase";

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [DeliveryBatchController],
  providers: [
    DeliveryBatchScheduler,
    GenerateDeliveryBatchUseCase,
    GenerateGlobalDeliveryBatchesUseCase,
    GetCourierBatchesUseCase,
    GetStoreBatchesUseCase,
    StartDeliveryBatchUseCase,
    MarkDeliveryItemDeliveredUseCase,
    GetDeliveryBatchDetailUseCase,
  ],
  exports: [GenerateDeliveryBatchUseCase],
})
export class DeliveryBatchModule {}
