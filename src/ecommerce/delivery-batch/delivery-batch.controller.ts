import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Body,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

import { JwtAuthGuard } from "../../core/auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-pengguna.decorator";
import { GetCourierBatchesUseCase } from "./use-cases/get-courier-batches.usecase";
import { GetDeliveryBatchDetailUseCase } from "./use-cases/get-delivery-batch-detail.usecase";
import { StartDeliveryBatchUseCase } from "./use-cases/start-delivery-batch.usecase";
import { MarkDeliveryItemDeliveredUseCase } from "./use-cases/mark-delivery-item-delivered.usecase";
import { GetStoreBatchesUseCase } from "./use-cases/get-store-batches.usecase";
import { GenerateGlobalDeliveryBatchesUseCase } from "./use-cases/generate-global-delivery-batches.usecase";
import { GenerateDeliveryBatchUseCase } from "./use-cases/generate-delivery-batch.usecase";

@ApiTags("Delivery Batch")
@Controller("delivery-batch")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeliveryBatchController {
  constructor(
    private readonly getCourierBatchesUC: GetCourierBatchesUseCase,
    private readonly getBatchDetailUC: GetDeliveryBatchDetailUseCase,
    private readonly startBatchUC: StartDeliveryBatchUseCase,
    private readonly markItemDeliveredUC: MarkDeliveryItemDeliveredUseCase,
    private readonly getStoreBatchesUC: GetStoreBatchesUseCase,
    private readonly generateGlobalBatchesUC: GenerateGlobalDeliveryBatchesUseCase,
    private readonly generateBatchUC: GenerateDeliveryBatchUseCase,
  ) {}

  // ─── Kurir Endpoints ──────────────────────────────────────────────────

  @Get("kurir/batches")
  @ApiOperation({ summary: "Get batches assigned to current courier" })
  async getCourierBatches(
    @CurrentUser("sub") penggunaId: string,
    @Query("tanggal") tanggal?: string,
  ) {
    const batches = await this.getCourierBatchesUC.execute(penggunaId, {
      tanggal,
    });
    return {
      statusCode: 200,
      message: "Batch pengiriman kurir berhasil diambil",
      data: batches,
    };
  }

  @Get("kurir/batches/:id")
  @ApiOperation({ summary: "Get batch detail with full pesanan info" })
  async getBatchDetail(@Param("id") batchId: string) {
    const batch = await this.getBatchDetailUC.execute(batchId);
    return {
      statusCode: 200,
      message: "Detail batch berhasil diambil",
      data: batch,
    };
  }

  @Post("kurir/batches/:id/start")
  @ApiOperation({ summary: "Start delivery batch (kurir mulai kirim)" })
  async startBatch(@Param("id") batchId: string) {
    const batch = await this.startBatchUC.execute(batchId);
    return {
      statusCode: 200,
      message: "Batch pengiriman dimulai",
      data: batch,
    };
  }

  @Post("kurir/batches/:batchId/items/:pesananId/delivered")
  @ApiOperation({ summary: "Mark a single item in batch as delivered" })
  async markItemDelivered(
    @Param("batchId") batchId: string,
    @Param("pesananId") pesananId: string,
  ) {
    const result = await this.markItemDeliveredUC.execute(batchId, pesananId);
    return {
      statusCode: 200,
      message: "Item berhasil ditandai terkirim",
      data: result,
    };
  }

  // ─── Seller Endpoints ─────────────────────────────────────────────────

  @Get("toko/:tokoId/batches")
  @ApiOperation({ summary: "Get batches for a specific store (seller view)" })
  async getStoreBatches(
    @Param("tokoId") tokoId: string,
    @Query("tanggal") tanggal?: string,
  ) {
    const batches = await this.getStoreBatchesUC.execute(tokoId, {
      tanggal,
    });
    return {
      statusCode: 200,
      message: "Batch pengiriman toko berhasil diambil",
      data: batches,
    };
  }

  // ─── Admin / Manual Trigger Endpoints ─────────────────────────────────

  @Post("generate")
  @ApiOperation({
    summary: "Manually trigger batch generation for all stores",
  })
  async generateBatches(@Body() body: { tipeBatch: "PAGI" | "SIANG" }) {
    const tipeBatch = body.tipeBatch || "PAGI";
    const results = await this.generateGlobalBatchesUC.execute(tipeBatch);
    return {
      statusCode: 200,
      message: `Batch ${tipeBatch} berhasil di-generate`,
      data: results,
    };
  }

  @Post("generate/:tokoId")
  @ApiOperation({
    summary: "Manually trigger batch generation for a specific store",
  })
  async generateBatchForStore(
    @Param("tokoId") tokoId: string,
    @Body() body: { tipeBatch?: "PAGI" | "SIANG" },
  ) {
    const tipeBatch = body.tipeBatch || "PAGI";
    const batch = await this.generateBatchUC.execute(tokoId, tipeBatch);
    return {
      statusCode: 200,
      message: batch
        ? `Batch ${tipeBatch} berhasil di-generate`
        : "Tidak ada pesanan untuk di-batch",
      data: batch,
    };
  }
}
