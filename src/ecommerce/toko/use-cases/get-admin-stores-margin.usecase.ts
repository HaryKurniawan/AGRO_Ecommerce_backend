import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class GetAdminStoresMarginUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    const stores = await this.prisma.toko.findMany({
      orderBy: { nama: "asc" },
      include: {
        priceConfig: true,
        produk: true,
      },
    });

    return stores.map((s) => {
      const defaultMargin = s.priceConfig
        ? s.priceConfig.marginDefaultPersen
        : 15.0;
      const marginMaxPersen = s.priceConfig
        ? s.priceConfig.marginMaxPersen
        : 30.0;
      const totalProduk = s.produk.length;
      const totalStock = s.produk.reduce(
        (acc, curr) => acc + (curr.stok || 0),
        0,
      );
      const totalEstimatedProfit = s.produk.reduce((acc, curr) => {
        const hpp = curr.hargaBeli || 0;
        const profitPerKg = curr.harga - hpp;
        return acc + (curr.stok || 0) * (profitPerKg > 0 ? profitPerKg : 0);
      }, 0);

      return {
        id: s.id,
        nama: s.nama,
        kabupaten: s.kabupaten,
        wilayah: s.wilayah,
        defaultMargin,
        marginMaxPersen,
        totalProduk,
        totalStock,
        totalEstimatedProfit,
      };
    });
  }
}
