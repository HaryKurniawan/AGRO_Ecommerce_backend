import { Module } from "@nestjs/common";

import { LogisticsController } from "./logistics.controller";
import { PrismaModule } from "../../infrastructure/database/prisma.module";
import { CalculateShippingCostsUseCase } from "./use-cases/calculate-shipping-costs.usecase";
import { UpdateShippingConfigUseCase } from "./use-cases/update-shipping-config.usecase";
import { LogisticsRepository } from "./logistics.repository";
import { OsmGeocodingService } from "./services/osm-geocoding.service";
import { OsrmRoutingService } from "./services/osrm-routing.service";

@Module({
  imports: [PrismaModule],
  controllers: [LogisticsController],
  providers: [
    CalculateShippingCostsUseCase,
    UpdateShippingConfigUseCase,
    LogisticsRepository,
    OsmGeocodingService,
    OsrmRoutingService,
  ],
  exports: [
    CalculateShippingCostsUseCase,
    UpdateShippingConfigUseCase,
    LogisticsRepository,
    OsmGeocodingService,
    OsrmRoutingService,
  ],
})
export class LogisticsModule {}
