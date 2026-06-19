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
    produk: { tokoId: string; hargaBeli?: number | null };
    pesanan: { status: StatusPesananEcom };
    isB2B?: boolean;
  }): Promise<TransaksiKeuntungan> {
    const {
      produkId,
      jumlah,
      harga,
      pesananId,
      id: itemPesananId,
    } = itemPesanan;

    // 1. Calculate Profit & Cost Basis
    let hargaBeliRataRata = 0;
    let totalHargaBeli = 0;
    let batchAllocations = [];

    if (itemPesanan.isB2B) {
      // B2B bypasses FIFO physical stock, uses base SBU price
      hargaBeliRataRata = itemPesanan.produk.hargaBeli || 0;
      totalHargaBeli = hargaBeliRataRata * jumlah;
    } else {
      // Normal Retail uses FIFO
      const fifoResult = await this.calculateFifoUC.execute(produkId, jumlah);
      hargaBeliRataRata = fifoResult.hargaBeliRataRata;
      totalHargaBeli = fifoResult.totalHargaBeli;
      batchAllocations = fifoResult.batchAllocations;
    }

    // 2. Calculate profit
    const totalHargaJual = jumlah * harga;
    const keuntungan = totalHargaJual - totalHargaBeli;
    const persenKeuntungan =
      totalHargaBeli > 0 ? (keuntungan / totalHargaBeli) * 100 : 0;

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
          hargaBeli: hargaBeliRataRata,
          totalHargaBeli: totalHargaBeli,
          statusPesanan: itemPesanan.pesanan.status,
        });

      // Create batch details for Retail
      for (const allocation of batchAllocations) {
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
