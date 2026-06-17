import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

import { JwtAuthGuard } from "../../../core/auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../../common/decorators/current-pengguna.decorator";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { GetTokoMarginConfigUseCase } from "../use-cases/get-toko-margin-config.usecase";
import { UpdateTokoMarginConfigUseCase } from "../use-cases/update-toko-margin-config.usecase";
import { OverrideProdukHargaUseCase } from "../use-cases/override-produk-harga.usecase";
import { GetTokoPricingSummaryUseCase } from "../use-cases/get-toko-pricing-summary.usecase";
import { GetMarginHistoryUseCase } from "../use-cases/get-margin-history.usecase";

@ApiTags("Toko B2B Harga & Profit - Seller")
@Controller("toko/harga")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HargaTokoSellerController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly getConfigUC: GetTokoMarginConfigUseCase,
    private readonly updateConfigUC: UpdateTokoMarginConfigUseCase,
    private readonly overrideHargaUC: OverrideProdukHargaUseCase,
    private readonly getSummaryUC: GetTokoPricingSummaryUseCase,
    private readonly getHistoryUC: GetMarginHistoryUseCase,
  ) {}

  // Helper: Find current seller store by penggunaId
  private async getStoreByUserId(penggunaId: string) {
    const profile = await this.prisma.profilPenjual.findUnique({
      where: { penggunaId },
    });
    if (!profile) {
      throw new BadRequestException("Pengguna bukan penjual");
    }
    const store = await this.prisma.toko.findUnique({
      where: { penjualId: profile.id },
    });
    if (!store) {
      throw new BadRequestException("Toko tidak ditemukan");
    }
    return store;
  }

  // 1. Get margin config
  @Get("config")
  @ApiOperation({ summary: "Get current store B2B pricing config" })
  async getConfig(@CurrentUser("sub") penggunaId: string) {
    const store = await this.getStoreByUserId(penggunaId);
    return this.getConfigUC.execute(store.id);
  }

  // 2. Update default margin config
  @Patch("config")
  @ApiOperation({ summary: "Update default B2B margin for the store" })
  async updateConfig(
    @CurrentUser("sub") penggunaId: string,
    @Body() body: { marginDefaultPersen: number },
  ) {
    const store = await this.getStoreByUserId(penggunaId);
    return this.updateConfigUC.execute({
      tokoId: store.id,
      marginDefaultPersen: body.marginDefaultPersen,
      diubahOlehId: penggunaId,
      diubahOlehPeran: "SELLER",
    });
  }

  // 3. Override margin / price for a specific product
  @Patch("produk/:produkId")
  @ApiOperation({ summary: "Override price/margin for a specific product" })
  async overrideProductPrice(
    @CurrentUser("sub") penggunaId: string,
    @Param("produkId") produkId: string,
    @Body()
    body: {
      marginPersen?: number | null;
      hargaJual?: number;
    },
  ) {
    const store = await this.getStoreByUserId(penggunaId);
    return this.overrideHargaUC.execute({
      tokoId: store.id,
      produkId,
      marginPersen: body.marginPersen,
      hargaJual: body.hargaJual,
      diubahOlehId: penggunaId,
      diubahOlehPeran: "SELLER",
    });
  }

  // 4. Get pricing & HPP summary table for all products
  @Get("summary")
  @ApiOperation({
    summary: "Get summary of all store products, HPP, and margins",
  })
  async getSummary(@CurrentUser("sub") penggunaId: string) {
    const store = await this.getStoreByUserId(penggunaId);
    return this.getSummaryUC.execute(store.id);
  }

  // 9. Get margin history for seller
  @Get("riwayat")
  @ApiOperation({ summary: "Get margin change history for seller store" })
  async getRiwayat(@CurrentUser("sub") penggunaId: string) {
    const store = await this.getStoreByUserId(penggunaId);
    return this.getHistoryUC.execute(store.id);
  }
}
