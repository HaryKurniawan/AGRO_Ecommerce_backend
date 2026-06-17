import { Injectable } from "@nestjs/common";

import { FindTransaksiByPesananQuery } from "../queries/find-transaksi-by-pesanan.query";
import { ProfitReportCommandRepository } from "../repositories/profit-report-command.repository";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { StokMasukService } from "../../stok-masuk/stok-masuk.service";

@Injectable()
export class HandleOrderCancellationUseCase {
  constructor(
    private findTransaksiByPesananQuery: FindTransaksiByPesananQuery,
    private profitReportCommandRepository: ProfitReportCommandRepository,
    private prisma: PrismaService,
    private stokMasukService: StokMasukService,
  ) {}

  async execute(pesananId: string): Promise<void> {
    await this.prisma.$transaction(async () => {
      // 1. Get all profit transactions for this order
      const transaksiList =
        await this.findTransaksiByPesananQuery.execute(pesananId);

      // 2. Return stock to batches
      for (const transaksi of transaksiList) {
        for (const batch of transaksi.batchDetails) {
          await this.stokMasukService.returnStockToBatch(
            batch.stokMasukId,
            batch.jumlahDigunakan,
          );
        }

        // 3. Update transaction status
        await this.profitReportCommandRepository.updateProfitTransactionStatus(
          pesananId,
          "DIBATALKAN",
        );
      }
    });
  }
}
