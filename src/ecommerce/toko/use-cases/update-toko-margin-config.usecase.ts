import { Injectable, BadRequestException } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class UpdateTokoMarginConfigUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(data: {
    tokoId: string;
    marginDefaultPersen?: number;
    marginMaxPersen?: number;
    diubahOlehId: string;
    diubahOlehPeran: "SELLER" | "ADMIN";
  }) {
    const store = await this.prisma.toko.findUnique({
      where: { id: data.tokoId },
    });
    if (!store) {
      throw new BadRequestException("Toko tidak ditemukan");
    }

    const oldConfig = await this.prisma.konfigurasiHargaToko.findUnique({
      where: { tokoId: data.tokoId },
    });

    const activeMaxMargin =
      data.marginMaxPersen !== undefined
        ? Number(data.marginMaxPersen)
        : oldConfig
          ? oldConfig.marginMaxPersen
          : 30.0;

    const activeDefaultMargin =
      data.marginDefaultPersen !== undefined
        ? Number(data.marginDefaultPersen)
        : oldConfig
          ? oldConfig.marginDefaultPersen
          : 15.0;

    if (activeDefaultMargin < 0 || activeMaxMargin < 0) {
      throw new BadRequestException(
        "Margin default persen dan batas max margin harus positif",
      );
    }

    if (activeDefaultMargin > activeMaxMargin) {
      throw new BadRequestException(
        `Margin default (${activeDefaultMargin}%) tidak boleh melampaui batas maksimum margin (${activeMaxMargin}%)`,
      );
    }

    const config = await this.prisma.konfigurasiHargaToko.upsert({
      where: { tokoId: data.tokoId },
      update: {
        marginDefaultPersen: Number(activeDefaultMargin),
        marginMaxPersen: Number(activeMaxMargin),
      },
      create: {
        tokoId: data.tokoId,
        marginDefaultPersen: Number(activeDefaultMargin),
        marginMaxPersen: Number(activeMaxMargin),
      },
    });

    if (
      !oldConfig ||
      oldConfig.marginDefaultPersen !== Number(activeDefaultMargin) ||
      oldConfig.marginMaxPersen !== Number(activeMaxMargin)
    ) {
      await this.prisma.riwayatMargin.create({
        data: {
          tokoId: data.tokoId,
          marginLama: oldConfig ? oldConfig.marginDefaultPersen : null,
          marginBaru: Number(activeDefaultMargin),
          diubahOlehPeran: data.diubahOlehPeran,
          diubahOlehId: data.diubahOlehId,
          keterangan: "Perubahan margin konfigurasi toko",
        },
      });
    }

    // Automatically recalculate selling price for all products that use default margin
    const products = await this.prisma.produkEcom.findMany({
      where: {
        tokoId: data.tokoId,
        hargaBeli: { not: null },
        marginPersen: null, // Only recalculate if they use default margin
      },
    });

    for (const p of products) {
      const hpp = p.hargaBeli || 0;
      if (hpp > 0) {
        const newPrice = hpp * (1 + Number(activeDefaultMargin) / 100);
        await this.prisma.produkEcom.update({
          where: { id: p.id },
          data: { harga: newPrice },
        });
      }
    }

    return config;
  }
}
