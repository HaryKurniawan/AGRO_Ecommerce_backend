import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiQuery } from "@nestjs/swagger";
import { ProfitReportService } from "./profit-report.service";
import {
  ProfitReportFiltersDto,
  ProfitSummaryFiltersDto,
} from "./dto/profit-report-filters.dto";
import { JwtAuthGuard } from "../../core/auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-pengguna.decorator";
import { PrismaService } from "../../infrastructure/database/prisma.service";

@ApiTags("Profit Report")
@Controller("ecommerce/profit-report")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProfitReportController {
  constructor(
    private profitReportService: ProfitReportService,
    private prisma: PrismaService,
  ) {}

  /**
   * Get profit report for a specific product
   * Only seller who owns the product can access
   */
  @Get("produk/:produkId")
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getProfitReport(
    @Param("produkId") produkId: string,
    @Query() filters: ProfitReportFiltersDto,
    @CurrentUser() user: any,
  ) {
    // Verify product exists and user is the owner
    const product = await this.prisma.produkEcom.findUnique({
      where: { id: produkId },
      include: { toko: { include: { penjual: true } } },
    });

    if (!product) {
      throw new BadRequestException("Produk tidak ditemukan");
    }

    // Check authorization: only seller owner or admin can access
    if (
      user.peran === "SELLER" &&
      product.toko.penjual.penggunaId !== user.id
    ) {
      throw new ForbiddenException(
        "Anda tidak memiliki akses ke laporan keuntungan produk ini",
      );
    }

    return this.profitReportService.getProfitReport(produkId, filters);
  }

  /**
   * Get profit summary for a store
   * Only seller who owns the store can access
   */
  @Get("toko/:tokoId/summary")
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  @ApiQuery({ name: "groupBy", required: false, type: String })
  @ApiQuery({ name: "isB2B", required: false, type: Boolean })
  async getProfitSummary(
    @Param("tokoId") tokoId: string,
    @Query() filters: ProfitSummaryFiltersDto,
    @CurrentUser() user: any,
  ) {
    // Verify store exists and user is the owner
    const toko = await this.prisma.toko.findUnique({
      where: { id: tokoId },
      include: { penjual: true },
    });

    if (!toko) {
      throw new BadRequestException("Toko tidak ditemukan");
    }

    // Check authorization: only seller owner or admin can access
    if (user.peran === "SELLER" && toko.penjual.penggunaId !== user.id) {
      throw new ForbiddenException(
        "Anda tidak memiliki akses ke laporan keuntungan toko ini",
      );
    }

    return this.profitReportService.getProfitSummary(tokoId, filters);
  }

  /**
   * Get global B2B summary for Admin
   */
  @Get("admin/b2b-summary")
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  async getAdminB2BSummary(
    @Query() filters: { startDate?: string; endDate?: string },
    @CurrentUser() user: any,
  ) {
    if (user.peran !== "SUPER_ADMIN" && user.peran !== "ADMIN_CS") {
      throw new ForbiddenException("Hanya Admin yang dapat mengakses laporan ini");
    }
    return this.profitReportService.getAdminB2BSummary(filters);
  }

  /**
   * Check stock availability for FIFO calculation
   */
  @Get("produk/:produkId/stock-availability")
  @ApiQuery({ name: "requiredQty", required: true, type: Number })
  async checkStockAvailability(
    @Param("produkId") produkId: string,
    @Query("requiredQty") requiredQty: number,
  ) {
    if (!requiredQty || requiredQty <= 0) {
      throw new BadRequestException("Required quantity harus lebih dari 0");
    }

    const isAvailable = await this.profitReportService.checkStockAvailability(
      produkId,
      requiredQty,
    );

    return {
      produkId,
      requiredQty,
      isAvailable,
    };
  }
}
