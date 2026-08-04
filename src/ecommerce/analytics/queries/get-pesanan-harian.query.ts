import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class GetPesananHarianQuery {
  constructor(private readonly prisma: PrismaService) {}

  async execute(tokoId: string, date: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const pesanans = await this.prisma.pesananEcom.findMany({
      where: {
        tokoId,
        createdAt: { gte: startOfDay, lte: endOfDay },
        status: { in: ["SELESAI", "DITUTUP"] as any },
      },
      select: {
        id_pesanan: true,
        totalHarga: true,
        status: true,
        createdAt: true,
        konsumen: { select: { id_pengguna: true, nama: true } },
        item: {
          select: {
            id_itemPesanan: true,
            jumlah: true,
            harga: true,
            produk: { select: { id_produk: true, nama: true, gambarUrl: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      tokoId,
      date,
      totalPesanan: pesanans.length,
      totalRevenue: pesanans.reduce((acc, curr) => acc + curr.totalHarga, 0),
      data: pesanans,
    };
  }
}




