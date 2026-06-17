import { Injectable, BadRequestException } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class GetTokoMarginConfigUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(tokoId: string) {
    let config = await this.prisma.konfigurasiHargaToko.findUnique({
      where: { tokoId },
    });

    if (!config) {
      config = await this.prisma.konfigurasiHargaToko.create({
        data: {
          tokoId,
          marginDefaultPersen: 15.0,
          marginMaxPersen: 30.0,
        },
      });
    }

    return config;
  }
}
