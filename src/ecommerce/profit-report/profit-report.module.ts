import { Module } from "@nestjs/common";

import { ProfitReportService } from "./profit-report.service";
import { ProfitReportController } from "./profit-report.controller";
import { StokMasukModule } from "../stok-masuk/stok-masuk.module";
import { ProfitReportCommandRepository } from "./repositories/profit-report-command.repository";
import { FindProfitTransactionsByProductQuery } from "./queries/find-profit-transactions-by-product.query";
import { GetProfitSummaryByProductQuery } from "./queries/get-profit-summary-by-product.query";
import { GetProfitSummaryByTokoQuery } from "./queries/get-profit-summary-by-toko.query";
import { GetTopProductsByTokoQuery } from "./queries/get-top-products-by-toko.query";
import { GetAdminB2BSummaryQuery } from "./queries/get-admin-b2b-summary.query";
import { FindTransaksiByPesananQuery } from "./queries/find-transaksi-by-pesanan.query";
import { CalculateFifoUseCase } from "./use-cases/calculate-fifo.usecase";
import { CreateProfitTransactionUseCase } from "./use-cases/create-profit-transaction.usecase";
import { GetProfitReportUseCase } from "./use-cases/get-profit-report.usecase";
import { GetProfitSummaryUseCase } from "./use-cases/get-profit-summary.usecase";
import { UpdateProfitTransactionStatusUseCase } from "./use-cases/update-profit-transaction-status.usecase";
import { HandleOrderCancellationUseCase } from "./use-cases/handle-order-cancellation.usecase";
import { PrismaModule } from "../../infrastructure/database/prisma.module";

@Module({
  imports: [StokMasukModule, PrismaModule],
  controllers: [ProfitReportController],
  providers: [
    ProfitReportCommandRepository,
    FindProfitTransactionsByProductQuery,
    GetProfitSummaryByProductQuery,
    GetProfitSummaryByTokoQuery,
    GetTopProductsByTokoQuery,
    GetAdminB2BSummaryQuery,
    FindTransaksiByPesananQuery,
    CalculateFifoUseCase,
    CreateProfitTransactionUseCase,
    GetProfitReportUseCase,
    GetProfitSummaryUseCase,
    UpdateProfitTransactionStatusUseCase,
    HandleOrderCancellationUseCase,
    ProfitReportService,
  ],
  exports: [ProfitReportService],
})
export class ProfitReportModule {}
