import { Controller, Post, Body, UseGuards, Get, Put } from "@nestjs/common";

import { CalculateShippingCostsUseCase } from "./use-cases/calculate-shipping-costs.usecase";
import {
  UpdateShippingConfigUseCase,
  UpdateShippingConfigDto,
} from "./use-cases/update-shipping-config.usecase";
import { LogisticsRepository } from "./logistics.repository";
import { JwtAuthGuard } from "../../core/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

interface CalculateRequest {
  customerAddressId: string;
  toko: {
    tokoId: string;
    totalWeightGram: number;
  }[];
}

@Controller("logistics")
@UseGuards(JwtAuthGuard)
export class LogisticsController {
  constructor(
    private readonly calculateShippingUC: CalculateShippingCostsUseCase,
    private readonly updateShippingConfigUC: UpdateShippingConfigUseCase,
    private readonly logisticsRepo: LogisticsRepository,
  ) {}

  @Post("calculate")
  async calculateShipping(@Body() dto: CalculateRequest) {
    const results = await this.calculateShippingUC.execute(dto);
    return {
      statusCode: 200,
      message: "Ongkos kirim berhasil dikalkulasi",
      data: results,
    };
  }

  @Get("config")
  async getConfig() {
    let config = await this.logisticsRepo.findFirstShippingConfig();
    if (!config) {
      config = await this.logisticsRepo.createShippingConfig({
        data: {
          gratisBawahKm: 5.0,
          ongkirFlat: 15000,
        },
      });
    }
    return {
      statusCode: 200,
      message: "Konfigurasi pengiriman berhasil diambil",
      data: config,
    };
  }

  @Put("config")
  @UseGuards(RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  async updateConfig(@Body() dto: UpdateShippingConfigDto) {
    const config = await this.updateShippingConfigUC.execute(dto);
    return {
      statusCode: 200,
      message: "Konfigurasi pengiriman berhasil diperbarui",
      data: config,
    };
  }
}
