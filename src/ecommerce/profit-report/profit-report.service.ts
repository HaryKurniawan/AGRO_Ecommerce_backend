import { Injectable } from "@nestjs/common";
import { StatusPesananEcom, TransaksiKeuntungan } from "@prisma/client";

import {
  ProfitReportFiltersDto,
  ProfitSummaryFiltersDto,
} from "./dto/profit-report-filters.dto";
import {
  ProfitReportResponseDto,
  ProfitSummaryResponseDto,
} from "./dto/profit-report-response.dto";
import {
  CalculateFifoUseCase,
  FIFOResult,
} from "./use-cases/calculate-fifo.usecase";
import { CreateProfitTransactionUseCase } from "./use-cases/create-profit-transaction.usecase";
import { GetProfitReportUseCase } from "./use-cases/get-profit-report.usecase";
import { GetProfitSummaryUseCase } from "./use-cases/get-profit-summary.usecase";
import { UpdateProfitTransactionStatusUseCase } from "./use-cases/update-profit-transaction-status.usecase";
import { HandleOrderCancellationUseCase } from "./use-cases/handle-order-cancellation.usecase";
import { StokMasukService } from "../stok-masuk/stok-masuk.service";
import { GetAdminB2BSummaryQuery } from "./queries/get-admin-b2b-summary.query";

@Injectable()
export class ProfitReportService {
  constructor(
    private calculateFifoUC: CalculateFifoUseCase,
    private createProfitTxUC: CreateProfitTransactionUseCase,
    private getProfitReportUC: GetProfitReportUseCase,
    private getProfitSummaryUC: GetProfitSummaryUseCase,
    private updateProfitTxStatusUC: UpdateProfitTransactionStatusUseCase,
    private handleOrderCancellationUC: HandleOrderCancellationUseCase,
    private getAdminB2BSummaryQuery: GetAdminB2BSummaryQuery,
    private stokMasukService: StokMasukService,
  ) {}

  async getAdminB2BSummary(filters: { startDate?: string; endDate?: string }) {
    return this.getAdminB2BSummaryQuery.execute(filters);
  }

  async calculateFIFO(
    produkId: string,
    jumlahDibutuhkan: number,
  ): Promise<FIFOResult> {
    return this.calculateFifoUC.execute(produkId, jumlahDibutuhkan);
  }

  async createProfitTransaction(itemPesanan: {
    id: string;
    pesananId: string;
    produkId: string;
    jumlah: number;
    harga: number;
    produk: { tokoId: string; hargaBeli?: number | null };
    pesanan: { status: StatusPesananEcom };
    isB2B?: boolean;
  }): Promise<TransaksiKeuntungan> {
    return this.createProfitTxUC.execute(itemPesanan);
  }

  async getProfitReport(
    produkId: string,
    filters: ProfitReportFiltersDto,
  ): Promise<ProfitReportResponseDto> {
    return this.getProfitReportUC.execute(produkId, filters);
  }

  async getProfitSummary(
    tokoId: string,
    filters: ProfitSummaryFiltersDto,
  ): Promise<ProfitSummaryResponseDto> {
    return this.getProfitSummaryUC.execute(tokoId, filters);
  }

  async updateProfitTransactionStatus(
    pesananId: string,
    newStatus: StatusPesananEcom,
  ): Promise<void> {
    return this.updateProfitTxStatusUC.execute(pesananId, newStatus);
  }

  async handleOrderCancellation(pesananId: string): Promise<void> {
    return this.handleOrderCancellationUC.execute(pesananId);
  }

  async checkStockAvailability(
    produkId: string,
    requiredQty: number,
  ): Promise<boolean> {
    return this.stokMasukService.checkStockAvailability(produkId, requiredQty);
  }
}
