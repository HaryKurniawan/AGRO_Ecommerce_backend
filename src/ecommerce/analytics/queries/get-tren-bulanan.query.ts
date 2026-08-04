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
        bulan: string;
        labelBulan: string;
        totalRevenue: number;
        totalQty: number;
        jumlahTransaksi: number;
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
        const bulanIso = `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, "0")}`;
  
        const records = await this.prisma.pesananEcom.findMany({
          where: {
            tokoId: filters.tokoId,
            status: { in: ["SELESAI", "DITUTUP"] as any },
            updatedAt: { gte: startCurrent, lte: endCurrent },
          },
          select: {
            id_pesanan: true,
            totalHarga: true,
            item: {
              select: {
                jumlah: true,
                produk: {
                  select: { beratGram: true }
                }
              }
            }
          },
        });
  
        let totalRevenue = 0;
        let totalQty = 0;
        const jumlahTransaksi = records.length;
  
        for (const record of records) {
          totalRevenue += record.totalHarga;
          for (const i of record.item) {
             const kg = (i.produk?.beratGram || 1000) / 1000;
             totalQty += i.jumlah * kg;
          }
        }
  
        aggregasiByMonth.push({
          bulan: bulanIso,
          labelBulan: periodeLabel,
          totalRevenue,
          totalQty,
          jumlahTransaksi,
        });
      }
  
      return mapTrenBulananData(aggregasiByMonth, bulanKe, filters.tokoId);
  }
}




