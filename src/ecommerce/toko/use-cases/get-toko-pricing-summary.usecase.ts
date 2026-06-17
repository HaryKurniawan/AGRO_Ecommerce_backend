import { Injectable, BadRequestException } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class GetTokoPricingSummaryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(tokoId: string) {
    const store = await this.prisma.toko.findUnique({
      where: { id: tokoId },
    });
    if (!store) {
      throw new BadRequestException("Toko tidak ditemukan");
    }

    const config = await this.prisma.konfigurasiHargaToko.findUnique({
      where: { tokoId },
    });
    const defaultMargin = config ? config.marginDefaultPersen : 15.0;
    const marginMaxPersen = config ? config.marginMaxPersen : 30.0;

    const products = await this.prisma.produkEcom.findMany({
      where: { tokoId },
      orderBy: { nama: "asc" },
    });

    const summary = products.map((p) => {
      const hpp = p.hargaBeli || 0;
      const margin =
        p.marginPersen !== null && p.marginPersen !== undefined
          ? p.marginPersen
          : defaultMargin;
      const profitPerKg = p.harga - hpp;

      return {
        id: p.id,
        nama: p.nama,
        stok: p.stok,
        satuan: p.satuan,
        hpp,
        hargaJual: p.harga,
        marginPersen: margin,
        isCustomMargin: p.marginPersen !== null,
        profitPerKg: profitPerKg > 0 ? profitPerKg : 0,
        estimasiProfitStok: (p.stok || 0) * (profitPerKg > 0 ? profitPerKg : 0),
      };
    });

    return {
      defaultMargin,
      marginMaxPersen,
      products: summary,
    };
  }
}
