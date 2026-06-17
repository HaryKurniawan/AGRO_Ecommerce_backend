import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Peran } from "@prisma/client";

import { JwtAuthGuard } from "../../../core/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../../core/auth/guards/roles.guard";
import { Roles } from "../../../core/auth/decorators/roles.decorator";
import { UpdateTokoMarginConfigUseCase } from "../use-cases/update-toko-margin-config.usecase";
import { OverrideProdukHargaUseCase } from "../use-cases/override-produk-harga.usecase";
import { GetTokoPricingSummaryUseCase } from "../use-cases/get-toko-pricing-summary.usecase";
import { GetMarginHistoryUseCase } from "../use-cases/get-margin-history.usecase";
import { GetAdminStoresMarginUseCase } from "../use-cases/get-admin-stores-margin.usecase";

@ApiTags("Toko B2B Harga & Profit - Admin")
@Controller("toko/harga")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class HargaTokoAdminController {
  constructor(
    private readonly updateConfigUC: UpdateTokoMarginConfigUseCase,
    private readonly overrideHargaUC: OverrideProdukHargaUseCase,
    private readonly getSummaryUC: GetTokoPricingSummaryUseCase,
    private readonly getHistoryUC: GetMarginHistoryUseCase,
    private readonly getAdminStoresMarginUC: GetAdminStoresMarginUseCase,
  ) {}

  // 5. Get all stores and their margin config and metrics
  @Get("admin/stores-margin")
  @Roles(Peran.SUPER_ADMIN, Peran.ADMIN_CS)
  @ApiOperation({
    summary:
      "Admin: Get all stores with their margin configuration and metrics",
  })
  async getAdminStoresMargin() {
    return this.getAdminStoresMarginUC.execute();
  }

  // 6. Get pricing & HPP summary table for all products of a specific store
  @Get("admin/:tokoId/summary")
  @Roles(Peran.SUPER_ADMIN, Peran.ADMIN_CS)
  @ApiOperation({
    summary:
      "Admin: Get summary of a specific store products, HPP, and margins",
  })
  async getAdminSummary(@Param("tokoId") tokoId: string) {
    return this.getSummaryUC.execute(tokoId);
  }

  // 7. Update default B2B margin for a specific store
  @Patch("admin/:tokoId/config")
  @Roles(Peran.SUPER_ADMIN, Peran.ADMIN_CS)
  @ApiOperation({
    summary: "Admin: Update default B2B margin for a specific store",
  })
  async updateAdminConfig(
    @Param("tokoId") tokoId: string,
    @Body() body: { marginDefaultPersen?: number; marginMaxPersen?: number },
  ) {
    return this.updateConfigUC.execute({
      tokoId,
      marginDefaultPersen: body.marginDefaultPersen,
      marginMaxPersen: body.marginMaxPersen,
      diubahOlehId: "ADMIN_SYSTEM",
      diubahOlehPeran: "ADMIN",
    });
  }

  // 8. Override price/margin for a specific product in a store
  @Patch("admin/:tokoId/produk/:produkId")
  @Roles(Peran.SUPER_ADMIN, Peran.ADMIN_CS)
  @ApiOperation({
    summary: "Admin: Override price/margin for a specific product in a store",
  })
  async adminOverrideProductPrice(
    @Param("tokoId") tokoId: string,
    @Param("produkId") produkId: string,
    @Body()
    body: {
      marginPersen?: number | null;
      hargaJual?: number;
    },
  ) {
    return this.overrideHargaUC.execute({
      tokoId,
      produkId,
      marginPersen: body.marginPersen,
      hargaJual: body.hargaJual,
      diubahOlehId: "ADMIN_SYSTEM",
      diubahOlehPeran: "ADMIN",
    });
  }

  // 10. Get all margin history for admin
  @Get("admin/riwayat")
  @Roles(Peran.SUPER_ADMIN, Peran.ADMIN_CS)
  @ApiOperation({ summary: "Admin: Get all margin change history" })
  async getAdminRiwayat(@Query("tokoId") tokoId?: string) {
    return this.getHistoryUC.execute(tokoId);
  }
}
