import { Injectable, BadRequestException } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class OverrideProdukHargaUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(data: {
    tokoId: string;
    produkId: string;
    marginPersen?: number | null;
    hargaJual?: number;
    diubahOlehId: string;
    diubahOlehPeran: "SELLER" | "ADMIN";
  }) {
    const product = await this.prisma.produkEcom.findFirst({
      where: { id: data.produkId, tokoId: data.tokoId },
    });

    if (!product) {
      throw new BadRequestException("Produk tidak ditemukan di toko ini");
    }

    const config = await this.prisma.konfigurasiHargaToko.findUnique({
      where: { tokoId: data.tokoId },
    });
    const activeMaxMargin = config ? config.marginMaxPersen : 30.0;

    const hpp = product.hargaBeli || 0;
    const updateData: any = {};

    if (data.marginPersen !== undefined) {
      updateData.marginPersen =
        data.marginPersen === null ? null : Number(data.marginPersen);

      if (data.marginPersen !== null) {
        if (Number(data.marginPersen) > activeMaxMargin) {
          throw new BadRequestException(
            `Margin persen (${data.marginPersen}%) melebihi batas maksimum (${activeMaxMargin}%)`,
          );
        }
      }

      if (data.marginPersen !== null && hpp > 0) {
        updateData.harga = hpp * (1 + Number(data.marginPersen) / 100);
      } else if (data.marginPersen === null && hpp > 0) {
        const activeMargin = config ? config.marginDefaultPersen : 15.0;
        updateData.harga = hpp * (1 + activeMargin / 100);
      }
    }

    if (data.hargaJual !== undefined) {
      updateData.harga = Number(data.hargaJual);

      if (hpp > 0) {
        const calculatedMargin = ((Number(data.hargaJual) - hpp) / hpp) * 100;
        if (calculatedMargin > activeMaxMargin) {
          throw new BadRequestException(
            `Harga jual menghasilkan margin (${calculatedMargin.toFixed(1)}%) yang melebihi batas maksimum (${activeMaxMargin}%)`,
          );
        }
        updateData.marginPersen = calculatedMargin;
      }
    }

    const updatedProduct = await this.prisma.produkEcom.update({
      where: { id: data.produkId },
      data: updateData,
    });

    if (updateData.marginPersen !== undefined) {
      let activeMargin = updateData.marginPersen;
      if (activeMargin === null) {
        activeMargin = config ? config.marginDefaultPersen : 15.0;
      }
      await this.prisma.riwayatMargin.create({
        data: {
          tokoId: data.tokoId,
          produkId: product.id,
          marginLama: product.marginPersen,
          marginBaru: activeMargin,
          diubahOlehPeran: data.diubahOlehPeran,
          diubahOlehId: data.diubahOlehId,
          keterangan:
            data.hargaJual !== undefined
              ? `Diubah via Harga Jual (${data.diubahOlehPeran})`
              : data.marginPersen === null
                ? `Reset ke default (${data.diubahOlehPeran})`
                : `Override khusus (${data.diubahOlehPeran})`,
        },
      });
    }

    return updatedProduct;
  }
}
