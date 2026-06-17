import { Controller, Get, Query, UseGuards, Res } from "@nestjs/common";
import { Response } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

import { SkipTransform } from "../../../common/decorators/skip-transform.decorator";
import { JwtAuthGuard } from "../../../core/auth/guards/jwt-auth.guard";
import { AdminFindAllOrdersUseCase } from "../use-cases/admin-find-all-pesanans.usecase";
import { GenerateAdminOrderReportUseCase } from "../use-cases/generate-admin-order-report.usecase";

@ApiTags("Ecom Pesanan - Admin")
@Controller("ecom-pesanan")
export class PesananAdminController {
  constructor(
    private readonly adminFindAllOrdersUC: AdminFindAllOrdersUseCase,
    private readonly generateAdminOrderReportUC: GenerateAdminOrderReportUseCase,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("admin/all")
  @ApiOperation({ summary: "Admin: get all pesanan" })
  async adminFindAll(
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<any> {
    return this.adminFindAllOrdersUC.execute({
      status,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @SkipTransform()
  @Get("admin/laporan/excel")
  @ApiOperation({ summary: "Admin: download global sales report as Excel" })
  async downloadAdminOrderReport(
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Res() res: Response,
  ): Promise<any> {
    const buffer = await this.generateAdminOrderReportUC.execute(
      startDate,
      endDate,
    );
    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        "attachment; filename=Laporan_Penjualan_Global_Admin.xlsx",
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }
}
