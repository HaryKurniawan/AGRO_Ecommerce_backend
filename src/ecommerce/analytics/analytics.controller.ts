import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiPropertyOptional,
} from "@nestjs/swagger";
import { IsOptional, IsString, IsNumber, Min, Max } from "class-validator";
import { Type } from "class-transformer";

import { JwtAuthGuard } from "../../core/auth/guards/jwt-auth.guard";
import { ApiKeyGuard } from "../../common/guards/api-key.guard";
import { GetProdukTerlarisPerKategoriUseCase } from "./use-cases/get-produk-terlaris-per-kategori.usecase";
import { GetRiwayatTerlarisUseCase } from "./use-cases/get-riwayat-terlaris.usecase";
import { GetTrenBulananUseCase } from "./use-cases/get-tren-bulanan.usecase";
import { GetTrenProdukBulananUseCase } from "./use-cases/get-tren-produk-bulanan.usecase";
import { GetPolaPenjualanUseCase } from "./use-cases/get-pola-penjualan.usecase";
import { GetPertumbuhanProdukUseCase } from "./use-cases/get-pertumbuhan-produk.usecase";
import { GetDemandSignalGudangUseCase } from "./use-cases/get-demand-signal-gudang.usecase";
import { GetTrenKomoditasGlobalUseCase } from "./use-cases/get-tren-komoditas-global.usecase";
import { GetPesananHarianUseCase } from "./use-cases/get-pesanan-harian.usecase";
import {
  ProdukTerlarisFilterDto,
  RiwayatBulananFilterDto,
  TrenBulananFilterDto,
  TrenProdukBulananFilterDto,
  PolaPenjualanFilterDto,
  PertumbuhanProdukFilterDto,
} from "./dto/produk-terlaris-filter.dto";
import { TrenKomoditasGlobalFilterDto } from "./dto/tren-komoditas-global.dto";

class DemandSignalFilterDto {
  @ApiPropertyOptional({ description: "ID Gudang (dari GUDANG service)" })
  @IsString()
  gudangId: string;

  @ApiPropertyOptional({ description: "Bulan (1-12)" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ description: "Tahun" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  year?: number;

  @ApiPropertyOptional({ default: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(30)
  limit?: number;
}

@ApiTags("Analytics")
@Controller("analytics")
export class AnalyticsController {
  constructor(
    private readonly getProdukTerlarisUC: GetProdukTerlarisPerKategoriUseCase,
    private readonly getRiwayatTerlarisUC: GetRiwayatTerlarisUseCase,
    private readonly getTrenBulananUC: GetTrenBulananUseCase,
    private readonly getTrenProdukBulananUC: GetTrenProdukBulananUseCase,
    private readonly getPolaPenjualanUC: GetPolaPenjualanUseCase,
    private readonly getPertumbuhanProdukUC: GetPertumbuhanProdukUseCase,
    private readonly getDemandSignalGudangUC: GetDemandSignalGudangUseCase,
    private readonly getTrenKomoditasGlobalUC: GetTrenKomoditasGlobalUseCase,
    private readonly getPesananHarianUC: GetPesananHarianUseCase,
  ) {}

  // ── Produk Terlaris (PUBLIC) ───────────────────────────────────────────────

  @Get("produk-terlaris")
  @ApiOperation({
    summary: "Produk terlaris per kategori dengan filter periode (Public)",
    description:
      "Menampilkan top N produk terlaris untuk setiap kategori. " +
      "Filter: period (TODAY/WEEK/MONTH/LAST_MONTH/3_MONTHS/YEAR/CUSTOM), " +
      "kategoriId, tokoId, limit, sortBy (terjual/revenue/transaksi)",
  })
  async getProdukTerlaris(@Query() filters: ProdukTerlarisFilterDto) {
    return this.getProdukTerlarisUC.execute(filters);
  }

  // ── Protected Analytics (SELLER / ADMIN ONLY) ──────────────────────────────

  @Get("produk-terlaris/riwayat")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Riwayat produk terlaris per bulan + perbandingan vs bulan sebelumnya",
    description:
      "Menampilkan produk terlaris untuk bulan & tahun tertentu (misal: Mei 2026), " +
      "lengkap dengan trend % naik/turun vs bulan sebelumnya.",
  })
  async getRiwayatTerlaris(@Query() filters: RiwayatBulananFilterDto) {
    return this.getRiwayatTerlarisUC.execute(filters);
  }

  // ── Tren Penjualan Seller (SELLER ONLY) ─────────────────────────────────────

  @Get("tren/bulanan")
  @UseGuards(ApiKeyGuard)
  @ApiOperation({
    summary: "Tren penjualan bulanan seller (grafik MoM)",
    description:
      "Revenue & qty terjual per bulan selama N bulan ke belakang. " +
      "Cocok untuk grafik bar. Include MoM growth % per bulan.",
  })
  async getTrenBulanan(@Query() filters: TrenBulananFilterDto) {
    return this.getTrenBulananUC.execute(filters);
  }

  @Get("tren/produk-bulanan")
  @UseGuards(ApiKeyGuard)
  @ApiOperation({
    summary: "Top produk terlaris untuk bulan tertentu + vs bulan sebelumnya",
    description:
      "Ranking produk terlaris bulan X dengan perbandingan vs bulan X-1. " +
      "Include trendArah (UP/DOWN/STABLE) per produk.",
  })
  async getTrenProdukBulanan(@Query() filters: TrenProdukBulananFilterDto) {
    return this.getTrenProdukBulananUC.execute(filters);
  }

  @Get("tren/pola")
  @UseGuards(ApiKeyGuard)
  @ApiOperation({
    summary: "Pola & Waktu Belanja",
    description: "Heatmap waktu belanja untuk mengetahui hari & jam teramai.",
  })
  async getPolaPenjualan(@Query() filters: PolaPenjualanFilterDto) {
    return this.getPolaPenjualanUC.execute(filters);
  }

  @Get("tren/pola/pesanan-harian")
  @UseGuards(ApiKeyGuard)
  @ApiOperation({
    summary: "Daftar Pesanan Harian",
    description:
      "Mendapatkan daftar pesanan yang selesai pada tanggal tertentu.",
  })
  async getPesananHarian(
    @Query("tokoId") tokoId: string,
    @Query("date") date: string,
  ) {
    return this.getPesananHarianUC.execute(tokoId, date);
  }

  @Get("tren/pertumbuhan-produk")
  @UseGuards(ApiKeyGuard)
  @ApiOperation({
    summary: "Analisis pertumbuhan per produk (3M vs 3M sebelumnya)",
    description:
      "Bandingkan performa setiap produk: 3 bulan terakhir vs 3 bulan sebelumnya. " +
      "Label: NAIK_PESAT (>20%) / STABIL / TURUN (<-5%).",
  })
  async getPertumbuhanProduk(@Query() filters: PertumbuhanProdukFilterDto) {
    return this.getPertumbuhanProdukUC.execute(filters);
  }

  // ── Tren Komoditas Global (dikonsumsi GUDANG service via API Key) ────────

  @Get("tren-komoditas-global")
  @UseGuards(ApiKeyGuard)
  @ApiOperation({
    summary:
      "Agregat tren penjualan per komoditas global (lintas semua toko, API Key only)",
    description:
      "Menghitung tren penjualan agregat per kodeKomoditasGlobal lintas seluruh toko. " +
      "Dikonsumsi oleh GUDANG service untuk menyimpan snapshot tren saat membuat Permintaan Pengadaan.",
  })
  async getTrenKomoditasGlobal(@Query() filters: TrenKomoditasGlobalFilterDto) {
    return this.getTrenKomoditasGlobalUC.execute(filters);
  }

  // ── Demand Signal untuk Gudang (dikonsumsi GUDANG service via API Key) ────

  @Get("demand-signal/gudang")
  @UseGuards(ApiKeyGuard)
  @ApiOperation({
    summary:
      "Agregasi tren penjualan dari semua seller afiliasi gudang (API Key only)",
    description:
      "Menghitung top komoditas terlaris dari semua seller yang terafiliasi ke " +
      "gudang tertentu. Digunakan oleh GUDANG service untuk menampilkan " +
      "sinyal permintaan pasar dan membuat Permintaan Pengadaan ke kepala petani.",
  })
  async getDemandSignalGudang(@Query() filters: DemandSignalFilterDto) {
    return this.getDemandSignalGudangUC.execute({
      gudangId: filters.gudangId,
      month: filters.month,
      year: filters.year,
      limit: filters.limit,
    });
  }
}
