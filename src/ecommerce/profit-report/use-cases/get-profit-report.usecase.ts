import { Injectable } from "@nestjs/common";

import { FindProfitTransactionsByProductQuery } from "../queries/find-profit-transactions-by-product.query";
import { GetProfitSummaryByProductQuery } from "../queries/get-profit-summary-by-product.query";
import { ProfitReportFiltersDto } from "../dto/profit-report-filters.dto";
import {
  ProfitReportResponseDto,
  ProfitTransactionDto,
  BatchDetailDto,
} from "../dto/profit-report-response.dto";

@Injectable()
export class GetProfitReportUseCase {
  constructor(
    private findProfitTransactionsQuery: FindProfitTransactionsByProductQuery,
    private getProfitSummaryQuery: GetProfitSummaryByProductQuery,
  ) {}

  async execute(
    produkId: string,
    filters: ProfitReportFiltersDto,
  ): Promise<ProfitReportResponseDto> {
    // Get transactions and total count
    const { transactions, total } =
      await this.findProfitTransactionsQuery.execute(produkId, filters);

    // Get summary
    const summary = await this.getProfitSummaryQuery.execute(produkId, filters);

    // Transform transactions
    const transaksi: ProfitTransactionDto[] = transactions.map((tx) => {
      const totalHargaJual = tx.jumlahTerjual * tx.hargaJual;
      const keuntungan = totalHargaJual - tx.totalHargaBeli;
      const persenKeuntungan = tx.totalHargaBeli > 0 ? (keuntungan / tx.totalHargaBeli) * 100 : 0;
      
      return {
        id: tx.id,
        tanggalTransaksi: tx.tanggalTransaksi.toISOString(),
        nomorPesanan: tx.pesanan.id,
        pesananId: tx.pesananId,
        jumlahTerjual: tx.jumlahTerjual,
        hargaBeli: tx.hargaBeli,
        hargaJual: tx.hargaJual,
        totalHargaBeli: tx.totalHargaBeli,
        totalHargaJual,
        keuntungan,
        persenKeuntungan,
        statusPesanan: tx.statusPesanan,
        batchDetails: tx.batchDetails.map(
          (batch): BatchDetailDto => ({
            stokMasukId: batch.stokMasukId,
            tanggalMasuk: batch.stokMasuk.tanggalMasuk.toISOString(),
            jumlahDigunakan: batch.jumlahDigunakan,
            hargaBeli: batch.hargaBeli,
            totalHargaBeli: batch.jumlahDigunakan * batch.hargaBeli,
          }),
        ),
      };
    });

    // Calculate pagination
    const totalPages = Math.ceil(total / (filters.limit || 20));
    const rataRataMargin =
      summary.totalHargaBeli > 0
        ? (summary.totalKeuntungan / summary.totalHargaBeli) * 100
        : 0;

    return {
      transaksi,
      summary: {
        ...summary,
        rataRataMargin,
      },
      pagination: {
        page: filters.page || 1,
        limit: filters.limit || 20,
        total,
        totalPages,
      },
    };
  }
}
