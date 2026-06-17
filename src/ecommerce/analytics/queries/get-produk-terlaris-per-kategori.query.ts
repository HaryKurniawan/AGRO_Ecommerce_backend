import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import {
  ProdukTerlarisFilterDto,
  SortByEnum,
} from "../dto/produk-terlaris-filter.dto";
import { periodToDateRange } from "../utils/period-to-date-range.util";
import { mapProdukTerlarisData } from "../mappers/produk-terlaris.mapper";

@Injectable()
export class GetProdukTerlarisPerKategoriQuery {
  constructor(private readonly prisma: PrismaService) {}

  async execute(filters: ProdukTerlarisFilterDto) {
    const dateRange = periodToDateRange(
      filters.period!,
      filters.startDate,
      filters.endDate,
    );
    const limit = filters.limit ?? 5;

    const records = await this.prisma.transaksiKeuntungan.findMany({
      where: {
        statusPesanan: "SELESAI",
        tanggalTransaksi: { gte: dateRange.gte, lte: dateRange.lte },
        ...(filters.tokoId && { tokoId: filters.tokoId }),
      },
      select: {
        id: true,
        produkId: true,
        jumlahTerjual: true,
        hargaJual: true,
      },
    });

    const productGroupsMap = new Map<string, { produkId: string; _sum: { jumlahTerjual: number; totalHargaJual: number }; _count: { id: number } }>();
    for (const record of records) {
      const existing = productGroupsMap.get(record.produkId) || {
        produkId: record.produkId,
        _sum: { jumlahTerjual: 0, totalHargaJual: 0 },
        _count: { id: 0 },
      };
      existing._sum.jumlahTerjual += record.jumlahTerjual;
      existing._sum.totalHargaJual += record.jumlahTerjual * record.hargaJual;
      existing._count.id += 1;
      productGroupsMap.set(record.produkId, existing);
    }
    const aggregasi = Array.from(productGroupsMap.values());

    if (aggregasi.length === 0) {
      return {
        period: {
          label: dateRange.label,
          startDate: dateRange.gte,
          endDate: dateRange.lte,
        },
        totalKategori: 0,
        data: [],
      };
    }

    const produkIds = aggregasi.map((a) => a.produkId);
    const produks = await this.prisma.produkEcom.findMany({
      where: {
        id: { in: produkIds },
        ...(filters.kategoriId && { kategoriId: filters.kategoriId }),
      },
      select: {
        id: true,
        nama: true,
        namaEtalase: true,
        gambarUrl: true,
        harga: true,
        satuan: true,
        kategoriId: true,
        tokoId: true,
        toko: { select: { id: true, nama: true } },
        kategori: { select: { id: true, nama: true, icon: true } },
      },
    });

    return mapProdukTerlarisData(
      aggregasi,
      produks,
      limit,
      filters.sortBy ?? SortByEnum.TERJUAL,
      dateRange.gte.toISOString(),
      dateRange.lte.toISOString(),
      dateRange.label,
    );
  }
}
