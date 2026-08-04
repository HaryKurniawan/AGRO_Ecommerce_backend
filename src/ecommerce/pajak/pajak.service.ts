import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { UpdatePajakDto } from "./dto/update-pajak.dto";

@Injectable()
export class PajakService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig() {
    let config = await this.prisma.konfigurasiPajak.findFirst();
    if (!config) {
      config = await this.prisma.konfigurasiPajak.create({
        data: {
          isAktif: false,
          persenPPN: 11.0,
        },
      });
    }
    return config;
  }

  async updateConfig(data: UpdatePajakDto) {
    const config = await this.getConfig();
    return this.prisma.konfigurasiPajak.update({
      where: { id: config.id },
      data,
    });
  }
}
