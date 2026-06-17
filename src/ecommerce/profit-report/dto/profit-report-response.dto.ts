import { StatusPesananEcom } from "@prisma/client";

export interface BatchDetailDto {
  stokMasukId: string;
  tanggalMasuk: string;
  jumlahDigunakan: number;
  hargaBeli: number;
  totalHargaBeli: number;
}

export interface ProfitTransactionDto {
  id: string;
  tanggalTransaksi: string;
  nomorPesanan: string;
  pesananId: string;
  jumlahTerjual: number;
  hargaBeli: number;
  hargaJual: number;
  totalHargaBeli: number;
  totalHargaJual: number;
  keuntungan: number;
  persenKeuntungan: number;
  statusPesanan: StatusPesananEcom;
  batchDetails: BatchDetailDto[];
}

export interface ProfitSummaryDto {
  totalTransaksi: number;
  totalKeuntungan: number;
  rataRataMargin: number;
  totalPenjualan: number;
  totalHargaBeli: number;
}

export interface PaginationDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ProfitReportResponseDto {
  transaksi: ProfitTransactionDto[];
  summary: ProfitSummaryDto;
  pagination: PaginationDto;
}

export interface TopProductDto {
  produkId: string;
  namaProduk: string;
  totalKeuntungan: number;
  totalTerjual: number;
}

export interface TrendDataDto {
  periode: string;
  keuntungan: number;
  penjualan: number;
}

export interface ProfitSummaryResponseDto {
  totalKeuntungan: number;
  totalPenjualan: number;
  totalHargaBeli: number;
  rataRataMargin: number;
  produkTerlaris: TopProductDto[];
  trendKeuntungan: TrendDataDto[];
}
