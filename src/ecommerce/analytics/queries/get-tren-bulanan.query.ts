import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { TrenBulananFilterDto } from "../dto/produk-terlaris-filter.dto";
import { mapTrenBulananData } from "../mappers/tren-bulanan.mapper";

const BULAN_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

@Injectable()
export class GetTrenBulananQuery {
  constructor(private readonly prisma: PrismaService) {}

  async execute(filters: TrenBulananFilterDto) {
    const now = new Date();
    const bulanKe = filters.bulanKe ?? 6;

    const aggregasiByMonth: {
      periode: string;
      totalRevenue: number;
      jumlahTerjual: number;
    }[] = [];

    // Loop from N months ago to current month
    for (let i = bulanKe - 1; i >= 0; i--) {
      const targetMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startCurrent = new Date(
        targetMonth.getFullYear(),
        targetMonth.getMonth(),
        1,
        0,
        0,
        0,
      );
      const endCurrent = new Date(
        targetMonth.getFullYear(),
        targetMonth.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );

      const periodeLabel = `${BULAN_ID[targetMonth.getMonth()]} ${targetMonth.getFullYear()}`;

      const records = await this.prisma.transaksiKeuntungan.findMany({
        where: {
          tokoId: filters.tokoId,
          statusPesanan: "SELESAI",
          tanggalTransaksi: { gte: startCurrent, lte: endCurrent },
        },
        select: {
          jumlahTerjual: true,
          hargaJual: true,
        },
      });

      let totalRevenue = 0;
      let jumlahTerjual = 0;
      for (const record of records) {
        totalRevenue += record.jumlahTerjual * record.hargaJual;
        jumlahTerjual += record.jumlahTerjual;
      }

      aggregasiByMonth.push({
        periode: periodeLabel,
        totalRevenue,
        jumlahTerjual,
      });
    }

    return mapTrenBulananData(aggregasiByMonth, bulanKe, filters.tokoId);
  }
}
