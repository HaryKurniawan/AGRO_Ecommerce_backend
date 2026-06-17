import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { LogisticsRepository } from "../logistics.repository";

export interface UpdateShippingConfigDto {
  jarakDasarKm?: number;
  hargaDasar?: number;
  hargaPerKmExtra?: number;
  beratDasarKg?: number;
  hargaPerKgExtra?: number;
  jarakMaksKm?: number;
  gratisBawahKm?: number;
  ongkirFlat?: number;
  gratisAboveKg?: number;
  ekspedisiBaseCost?: number;
  ekspedisiPerKgCost?: number;
  ekspedisiPerKmCost?: number;
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
          jarakDasarKm: dto.jarakDasarKm ?? 5.0,
          hargaDasar: dto.hargaDasar ?? 10000,
          hargaPerKmExtra: dto.hargaPerKmExtra ?? 2000,
          beratDasarKg: dto.beratDasarKg ?? 5.0,
          hargaPerKgExtra: dto.hargaPerKgExtra ?? 5000,
          jarakMaksKm: dto.jarakMaksKm ?? 50.0,
          gratisBawahKm: dto.gratisBawahKm ?? 5.0,
          ongkirFlat: dto.ongkirFlat ?? 15000,
          gratisAboveKg: dto.gratisAboveKg ?? 300,
          ekspedisiBaseCost: dto.ekspedisiBaseCost ?? 20000,
          ekspedisiPerKgCost: dto.ekspedisiPerKgCost ?? 8000,
          ekspedisiPerKmCost: dto.ekspedisiPerKmCost ?? 1500,
        },
      });
    }

    return this.logisticsRepo.updateShippingConfig(activeConfig.id, dto);
  }
}
