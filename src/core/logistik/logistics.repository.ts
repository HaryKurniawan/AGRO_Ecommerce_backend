import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../infrastructure/database/prisma.service";

@Injectable()
export class LogisticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findFirstShippingConfig() {
    return this.prisma.konfigurasiPengiriman.findFirst();
  }

  async createShippingConfig(args: Prisma.KonfigurasiPengirimanCreateArgs) {
    return this.prisma.konfigurasiPengiriman.create(args);
  }

  async findTokoById(id: string) {
    return this.prisma.toko.findUnique({ where: { id } });
  }

  async updateShippingConfig(
    id: string,
    data: Prisma.KonfigurasiPengirimanUpdateInput,
  ) {
    return this.prisma.konfigurasiPengiriman.update({
      where: { id },
      data,
    });
  }
}
