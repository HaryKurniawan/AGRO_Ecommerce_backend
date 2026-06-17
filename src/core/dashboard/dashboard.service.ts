import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../infrastructure/database/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [
      totalPengguna,
      totalPenjual,
      totalToko,
      totalPesanan,
      pengajuanPending,
      totalGMV,
    ] = await Promise.all([
      this.prisma.pengguna.count(),
      this.prisma.profilPenjual.count({ where: { status: "DISETUJUI" } }),
      this.prisma.toko.count(),
      this.prisma.pesananEcom.count(),
      this.prisma.pengajuanStokToko.count({ where: { status: "DIAJUKAN" } }),
      this.prisma.pesananEcom.aggregate({
        _sum: { totalHarga: true },
        where: { status: "SELESAI" },
      }),
    ]);

    return {
      overview: [
        { label: "Total Pengguna", value: totalPengguna, trend: "Aktif" },
        {
          label: "Penjual Terverifikasi",
          value: totalPenjual,
          trend: "Verified",
        },
        { label: "Total Toko", value: totalToko, trend: "Active" },
        { label: "Total Pesanan", value: totalPesanan, trend: "All Time" },
        {
          label: "Pengajuan Stok Baru",
          value: pengajuanPending,
          trend: "Pending Gudang",
        },
        {
          label: "Total GMV",
          value: totalGMV._sum.totalHarga || 0,
          trend: "Rupiah",
        },
      ],
    };
  }
}
