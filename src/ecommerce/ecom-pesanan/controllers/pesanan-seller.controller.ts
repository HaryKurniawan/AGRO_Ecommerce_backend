import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

import { SkipTransform } from "../../../common/decorators/skip-transform.decorator";
import { JwtAuthGuard } from "../../../core/auth/guards/jwt-auth.guard";
import { SellerFindOrdersUseCase } from "../use-cases/seller-find-pesanans.usecase";
import { UpdateOrderStatusUseCase } from "../use-cases/update-pesanan-status.usecase";
import { InitShippingUseCase } from "../use-cases/init-shipping.usecase";
import { GenerateOrderReportUseCase } from "../use-cases/generate-order-report.usecase";
import { SellerConfirmOrderUseCase } from "../use-cases/seller-confirm-order.usecase";
import { UpdatePesananStatusDto } from "../dto/update-pesanan-status.dto";
import { InitShippingDto } from "../dto/init-shipping.dto";

@ApiTags("Ecom Pesanan - Seller")
@Controller("ecom-pesanan")
export class PesananSellerController {
  constructor(
    private readonly sellerFindOrdersUC: SellerFindOrdersUseCase,
    private readonly updateOrderStatusUC: UpdateOrderStatusUseCase,
    private readonly initShippingUC: InitShippingUseCase,
    private readonly generateOrderReportUC: GenerateOrderReportUseCase,
    private readonly sellerConfirmOrderUC: SellerConfirmOrderUseCase,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("penjual/:tokoId")
  @ApiOperation({ summary: "Seller: get pesanan for toko" })
  async sellerFindOrders(
    @Param("tokoId") tokoId: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("isGrosir") isGrosir?: string,
  ): Promise<any> {
    return this.sellerFindOrdersUC.execute(
      tokoId,
      status,
      page ? +page : 1,
      limit ? +limit : 10,
      isGrosir === "true" ? true : isGrosir === "false" ? false : undefined,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(":id/status")
  @ApiOperation({ summary: "Update pesanan status" })
  async updateStatus(
    @Param("id") id: string,
    @Body() payload: UpdatePesananStatusDto,
  ): Promise<any> {
    return this.updateOrderStatusUC.execute(id, payload.status, payload.fotoSebelumKirimUrl);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(":id/pengiriman")
  @ApiOperation({
    summary: "Seller: initialize pengiriman for pesanan (sets to PREPARING)",
  })
  async initShipping(
    @Param("id") id: string,
    @Body() payload: InitShippingDto,
  ): Promise<any> {
    return this.initShippingUC.execute(id, payload);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(":id/seller-confirm")
  @ApiOperation({
    summary: "Seller: Konfirmasi & tutup pesanan yang sudah diterima pembeli",
  })
  async sellerConfirmOrder(@Param("id") id: string): Promise<any> {
    return this.sellerConfirmOrderUC.execute(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @SkipTransform()
  @Get("penjual/:tokoId/laporan/excel")
  @ApiOperation({ summary: "Seller: download order report as Excel" })
  async downloadOrderReport(
    @Param("tokoId") tokoId: string,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Res() res: Response,
  ): Promise<any> {
    const buffer = await this.generateOrderReportUC.execute(
      tokoId,
      startDate,
      endDate,
    );
    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=Laporan_Pesanan_${tokoId}.xlsx`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }
}
