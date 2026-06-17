import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";

import { JwtAuthGuard } from "../../../core/auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../../common/decorators/current-pengguna.decorator";
import { FindCourierTasksUseCase } from "../use-cases/find-courier-tasks.usecase";
import { UpdateShippingStatusUseCase } from "../use-cases/update-shipping-status.usecase";
import { SubmitDeliveryProofUseCase } from "../use-cases/submit-delivery-proof.usecase";
import { AdvanceShippingStatusDto } from "../dto/advance-shipping-status.dto";
import { SubmitDeliveryProofDto } from "../dto/submit-delivery-proof.dto";

@ApiTags("Ecom Pesanan - Courier")
@Controller("ecom-pesanan")
export class PesananCourierController {
  constructor(
    private readonly findCourierTasksUC: FindCourierTasksUseCase,
    private readonly updateShippingStatusUC: UpdateShippingStatusUseCase,
    private readonly submitDeliveryProofUC: SubmitDeliveryProofUseCase,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("courier/tasks")
  @ApiOperation({ summary: "Courier: get assigned tasks" })
  async findCourierTasks(
    @CurrentUser("sub") courierId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<any> {
    return this.findCourierTasksUC.execute(courierId, {
      page: page ? +page : 1,
      limit: limit ? +limit : 10,
    });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(":id/pengiriman/next")
  @ApiOperation({
    summary:
      "Seller/Courier: advance pengiriman to next status (PREPARING→LOADING→IN_TRANSIT→ARRIVED)",
  })
  async advanceShippingStatus(
    @Param("id") id: string,
    @Body() payload: AdvanceShippingStatusDto,
  ): Promise<any> {
    return this.updateShippingStatusUC.execute(id, payload);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(":id/bukti-kirim")
  @ApiOperation({ summary: "Submit delivery proof with photos" })
  @ApiResponse({ status: 200, description: "Proof submitted successfully" })
  async submitDeliveryProof(
    @Param("id") id: string,
    @Body() payload: SubmitDeliveryProofDto,
  ): Promise<any> {
    return this.submitDeliveryProofUC.execute(id, payload);
  }
}
