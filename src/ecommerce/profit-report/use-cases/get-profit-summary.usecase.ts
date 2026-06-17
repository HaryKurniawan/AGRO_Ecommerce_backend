import { Injectable } from "@nestjs/common";

import { GetProfitSummaryByTokoQuery } from "../queries/get-profit-summary-by-toko.query";
import { GetTopProductsByTokoQuery } from "../queries/get-top-products-by-toko.query";
import { ProfitSummaryFiltersDto } from "../dto/profit-report-filters.dto";
import { ProfitSummaryResponseDto } from "../dto/profit-report-response.dto";

@Injectable()
export class GetProfitSummaryUseCase {
  constructor(
    private getProfitSummaryQuery: GetProfitSummaryByTokoQuery,
    private getTopProductsQuery: GetTopProductsByTokoQuery,
  ) {}

  async execute(
    tokoId: string,
    filters: ProfitSummaryFiltersDto,
  ): Promise<ProfitSummaryResponseDto> {
    // Get overall summary
    const summary = await this.getProfitSummaryQuery.execute(tokoId, filters);

    // Get top products
    const produkTerlaris = await this.getTopProductsQuery.execute(
      tokoId,
      filters,
      5,
    );

    // Calculate average margin
    const rataRataMargin =
      summary.totalHargaBeli > 0
        ? (summary.totalKeuntungan / summary.totalHargaBeli) * 100
        : 0;

    // TODO: Implement trend data based on groupBy
    const trendKeuntungan = []; // Placeholder for now

    return {
      totalKeuntungan: summary.totalKeuntungan,
      totalPenjualan: summary.totalPenjualan,
      totalHargaBeli: summary.totalHargaBeli,
      rataRataMargin,
      produkTerlaris,
      trendKeuntungan,
    };
  }
}
