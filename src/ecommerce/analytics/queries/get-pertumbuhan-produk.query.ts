import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { PertumbuhanProdukFilterDto } from "../dto/produk-terlaris-filter.dto";
import { getPertumbuhanDateRange } from "../utils/period-to-date-range.util";
import { mapPertumbuhanProdukData } from "../mappers/pertumbuhan-produk.mapper";

@Injectable()
export class GetPertumbuhanProdukQuery {
  constructor(private readonly prisma: PrismaService) {}

  async execute(filters: PertumbuhanProdukFilterDto) {
    const {
      periodeAStart,
      periodeAEnd,
      periodeBStart,
      periodeBEnd,
      labelFormatHelper,
    } = getPertumbuhanDateRange(
      filters.period || "MONTH",
      filters.month,
      filters.year,
    );

    const whereBase = {
      tokoId: filters.tokoId,
      statusPesanan: "SELESAI" as const,
    };

    const [txA, txB] = await Promise.all([
      this.prisma.transaksiKeuntungan.findMany({
        where: {
          ...whereBase,
          tanggalTransaksi: { gte: periodeAStart, lte: periodeAEnd },
        },
        select: { produkId: true, jumlahTerjual: true, hargaJual: true },
      }),
      this.prisma.transaksiKeuntungan.findMany({
        where: {
          ...whereBase,
          tanggalTransaksi: { gte: periodeBStart, lte: periodeBEnd },
        },
        select: { produkId: true, jumlahTerjual: true, hargaJual: true },
      }),
    ]);

    const mapA = new Map<string, any>();
    for (const t of txA) {
      if (!mapA.has(t.produkId)) {
        mapA.set(t.produkId, {
          produkId: t.produkId,
          _sum: { jumlahTerjual: 0, totalHargaJual: 0 },
        });
      }
      const agg = mapA.get(t.produkId);
      agg._sum.jumlahTerjual += t.jumlahTerjual;
      agg._sum.totalHargaJual += t.jumlahTerjual * Number(t.hargaJual);
    }
    const aggA = Array.from(mapA.values());

    const mapB = new Map<string, any>();
    for (const t of txB) {
      if (!mapB.has(t.produkId)) {
        mapB.set(t.produkId, {
          produkId: t.produkId,
          _sum: { jumlahTerjual: 0, totalHargaJual: 0 },
        });
      }
      const agg = mapB.get(t.produkId);
      agg._sum.jumlahTerjual += t.jumlahTerjual;
      agg._sum.totalHargaJual += t.jumlahTerjual * Number(t.hargaJual);
    }
    const aggB = Array.from(mapB.values());

    const allProdukIds = [
      ...new Set([
        ...aggA.map((a) => a.produkId),
        ...aggB.map((b) => b.produkId),
      ]),
    ];

    const produks = await this.prisma.produkEcom.findMany({
      where: { id: { in: allProdukIds }, tokoId: filters.tokoId },
      select: {
        id: true,
        nama: true,
        namaEtalase: true,
        gambarUrl: true,
        satuan: true,
        kategori: { select: { id: true, nama: true } },
      },
    });

    return mapPertumbuhanProdukData(
      aggA,
      aggB,
      produks,
      labelFormatHelper,
      periodeAStart,
      periodeAEnd,
      periodeBStart,
      periodeBEnd,
      filters.tokoId,
    );
  }
}
