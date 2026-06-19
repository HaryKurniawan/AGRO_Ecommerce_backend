import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class GetAdminB2BSummaryQuery {
  constructor(private prisma: PrismaService) {}

  async execute(filters: { startDate?: string; endDate?: string }): Promise<{
    totalTonaseKg: number;
    pendapatanPokokSbu: number;
    totalPesananB2b: number;
    totalKeuntunganSeller: number;
  }> {
    const where: any = {
      pesanan: {
        isGrosir: true,
      },
    };

    if (filters.startDate) {
      where.tanggalTransaksi = { gte: new Date(filters.startDate) };
    }
    if (filters.endDate) {
      where.tanggalTransaksi = {
        ...where.tanggalTransaksi,
        lte: new Date(filters.endDate),
      };
    }

    const records = await this.prisma.transaksiKeuntungan.findMany({
      where,
      select: {
        jumlahTerjual: true,
        hargaJual: true,
        totalHargaBeli: true,
        pesananId: true,
      },
    });

    let totalTonaseKg = 0;
    let pendapatanPokokSbu = 0; // The base cost paid to SBU
    let totalPenjualanSeller = 0;
    const uniqueOrders = new Set<string>();

    for (const record of records) {
      totalTonaseKg += record.jumlahTerjual;
      pendapatanPokokSbu += record.totalHargaBeli;
      totalPenjualanSeller += record.jumlahTerjual * record.hargaJual;
      uniqueOrders.add(record.pesananId);
    }

    const totalKeuntunganSeller = totalPenjualanSeller - pendapatanPokokSbu;

    return {
      totalTonaseKg,
      pendapatanPokokSbu,
      totalPesananB2b: uniqueOrders.size,
      totalKeuntunganSeller,
    };
  }
}
