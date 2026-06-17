import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  Min,
  Max,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export enum PeriodEnum {
  TODAY = "TODAY",
  WEEK = "WEEK",
  MONTH = "MONTH",
  LAST_MONTH = "LAST_MONTH",
  THREE_MONTHS = "3_MONTHS",
  SIX_MONTHS = "6_MONTHS",
  YEAR = "YEAR",
  CUSTOM = "CUSTOM",
}

export enum SortByEnum {
  TERJUAL = "terjual",
  REVENUE = "revenue",
  TRANSAKSI = "transaksi",
}

export class ProdukTerlarisFilterDto {
  @ApiPropertyOptional({ enum: PeriodEnum, default: PeriodEnum.MONTH })
  @IsOptional()
  @IsEnum(PeriodEnum)
  period?: PeriodEnum = PeriodEnum.MONTH;

  @ApiPropertyOptional({
    description: "Tanggal awal (YYYY-MM-DD), wajib jika period=CUSTOM",
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: "Tanggal akhir (YYYY-MM-DD), wajib jika period=CUSTOM",
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: "Filter per kategori (opsional)" })
  @IsOptional()
  @IsString()
  kategoriId?: string;

  @ApiPropertyOptional({
    description: "Filter per toko (opsional, admin only)",
  })
  @IsOptional()
  @IsString()
  tokoId?: string;

  @ApiPropertyOptional({
    description: "Jumlah top produk per kategori",
    default: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number = 5;

  @ApiPropertyOptional({ enum: SortByEnum, default: SortByEnum.TERJUAL })
  @IsOptional()
  @IsEnum(SortByEnum)
  sortBy?: SortByEnum = SortByEnum.TERJUAL;
}

export class RiwayatBulananFilterDto {
  @ApiPropertyOptional({ description: "Bulan (1-12)" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ description: "Tahun (misal 2026)" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  year?: number;

  @ApiPropertyOptional({ description: "Filter per kategori (opsional)" })
  @IsOptional()
  @IsString()
  kategoriId?: string;

  @ApiPropertyOptional({ description: "Filter per toko (opsional)" })
  @IsOptional()
  @IsString()
  tokoId?: string;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number = 5;
}

export class TrenBulananFilterDto {
  @ApiPropertyOptional({ description: "ID Toko seller", required: true })
  @IsString()
  tokoId: string;

  @ApiPropertyOptional({ description: "Jumlah bulan ke belakang", default: 6 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(24)
  bulanKe?: number = 6;
}

export class TrenProdukBulananFilterDto {
  @ApiPropertyOptional({ description: "ID Toko seller", required: true })
  @IsString()
  tokoId: string;

  @ApiPropertyOptional({
    enum: PeriodEnum,
    description: "Period type (WEEK/MONTH)",
  })
  @IsOptional()
  @IsEnum(PeriodEnum)
  period?: PeriodEnum;

  @ApiPropertyOptional({ description: "Bulan (1-12)" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ description: "Tahun (misal 2026)" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  year?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number = 10;
}

export class PolaPenjualanFilterDto {
  @ApiPropertyOptional({ required: true })
  @IsString()
  tokoId: string;

  @ApiPropertyOptional({ description: "Bulan (opsional, 1-12)" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ description: "Tahun (default: tahun ini)" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  year?: number;
}

export class PertumbuhanProdukFilterDto {
  @ApiPropertyOptional({ required: true })
  @IsString()
  tokoId: string;

  @ApiPropertyOptional({
    enum: PeriodEnum,
    description: "Period type (WEEK/MONTH)",
  })
  @IsOptional()
  @IsEnum(PeriodEnum)
  period?: PeriodEnum;

  @ApiPropertyOptional({ description: "Bulan (1-12)" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ description: "Tahun (misal 2026)" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  year?: number;
}
