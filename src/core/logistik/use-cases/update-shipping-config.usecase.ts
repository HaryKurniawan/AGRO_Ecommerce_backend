import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { LogisticsRepository } from "../logistics.repository";

export interface UpdateShippingConfigDto {
  gratisBawahKm?: number;
  ongkirFlat?: number;
}

@Injectable()
export class UpdateShippingConfigUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logisticsRepo: LogisticsRepository,
  ) {}

  async execute(dto: UpdateShippingConfigDto) {
    const activeConfig = await this.logisticsRepo.findFirstShippingConfig();
    if (!activeConfig) {
      return this.prisma.konfigurasiPengiriman.create({
        data: {
          gratisBawahKm: dto.gratisBawahKm ?? 5.0,
          ongkirFlat: dto.ongkirFlat ?? 15000,
        },
      });
    }

    return this.logisticsRepo.updateShippingConfig(activeConfig.id, dto);
  }
}
