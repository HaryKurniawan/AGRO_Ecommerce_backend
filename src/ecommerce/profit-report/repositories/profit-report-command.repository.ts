import { Injectable } from "@nestjs/common";
import {
  TransaksiKeuntungan,
  TransaksiKeuntunganBatch,
  StatusPesananEcom,
} from "@prisma/client";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class ProfitReportCommandRepository {
  constructor(private prisma: PrismaService) {}

  async createProfitTransaction(data: {
    itemPesananId: string;
    pesananId: string;
    produkId: string;
    tokoId: string;
    jumlahTerjual: number;
    hargaJual: number;
    hargaBeli: number;
    totalHargaBeli: number;
    statusPesanan: StatusPesananEcom;
  }): Promise<TransaksiKeuntungan> {
    return this.prisma.transaksiKeuntungan.create({
      data,
    });
  }

  async createProfitTransactionBatch(data: {
    transaksiKeuntunganId: string;
    stokMasukId: string;
    jumlahDigunakan: number;
    hargaBeli: number;
  }): Promise<TransaksiKeuntunganBatch> {
    return this.prisma.transaksiKeuntunganBatch.create({
      data,
    });
  }

  async updateProfitTransactionStatus(
    pesananId: string,
    newStatus: StatusPesananEcom,
  ): Promise<void> {
    await this.prisma.transaksiKeuntungan.updateMany({
      where: { pesananId },
      data: { statusPesanan: newStatus },
    });
  }

  async deleteProfitTransaction(itemPesananId: string): Promise<void> {
    await this.prisma.transaksiKeuntungan.delete({
      where: { itemPesananId },
    });
  }
}
