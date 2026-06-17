import { Injectable } from "@nestjs/common";
import { StatusPesananEcom, TransaksiKeuntungan } from "@prisma/client";

import { ProfitReportCommandRepository } from "../repositories/profit-report-command.repository";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { CalculateFifoUseCase } from "./calculate-fifo.usecase";
import { StokMasukService } from "../../stok-masuk/stok-masuk.service";

@Injectable()
export class CreateProfitTransactionUseCase {
  constructor(
    private calculateFifoUC: CalculateFifoUseCase,
    private profitReportRepository: ProfitReportCommandRepository,
    private prisma: PrismaService,
    private stokMasukService: StokMasukService,
  ) {}

  async execute(itemPesanan: {
    id: string;
    pesananId: string;
    produkId: string;
    jumlah: number;
    harga: number;
    produk: { tokoId: string };
    pesanan: { status: StatusPesananEcom };
  }): Promise<TransaksiKeuntungan> {
    const {
      produkId,
      jumlah,
      harga,
      pesananId,
      id: itemPesananId,
    } = itemPesanan;

    // 1. Calculate FIFO
    const fifoResult = await this.calculateFifoUC.execute(produkId, jumlah);

    // 2. Calculate profit
    const totalHargaJual = jumlah * harga;
    const keuntungan = totalHargaJual - fifoResult.totalHargaBeli;
    const persenKeuntungan =
      fifoResult.totalHargaBeli > 0
        ? (keuntungan / fifoResult.totalHargaBeli) * 100
        : 0;

    // 3. Create transaction with database transaction
    const transaksi = await this.prisma.$transaction(async () => {
      // Create profit transaction
      const profitTx =
        await this.profitReportRepository.createProfitTransaction({
          itemPesananId,
          pesananId,
          produkId,
          tokoId: itemPesanan.produk.tokoId,
          jumlahTerjual: jumlah,
          hargaJual: harga,
          hargaBeli: fifoResult.hargaBeliRataRata,
          totalHargaBeli: fifoResult.totalHargaBeli,
          statusPesanan: itemPesanan.pesanan.status,
        });

      // Create batch details
      for (const allocation of fifoResult.batchAllocations) {
        await this.profitReportRepository.createProfitTransactionBatch({
          transaksiKeuntunganId: profitTx.id,
          stokMasukId: allocation.batchId,
          jumlahDigunakan: allocation.jumlahDigunakan,
          hargaBeli: allocation.hargaBeli,
        });

        // Update batch stock
        await this.stokMasukService.allocateStockFromBatches(
          allocation.batchId,
          allocation.jumlahDigunakan,
        );
      }

      return profitTx;
    });

    return transaksi;
  }
}
