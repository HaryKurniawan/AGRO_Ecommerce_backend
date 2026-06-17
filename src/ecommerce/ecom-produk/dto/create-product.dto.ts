import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateProductDto {
  @ApiProperty({ description: "ID Kategori produk" })
  @IsString()
  @IsNotEmpty()
  kategoriId: string;

  @ApiProperty({ description: "Nama produk" })
  @IsString()
  @IsNotEmpty()
  nama: string;

  @ApiProperty({ description: "Deskripsi produk" })
  @IsString()
  @IsNotEmpty()
  deskripsi: string;

  @ApiProperty({ description: "Harga per kg/satuan" })
  @IsNumber()
  @Min(0)
  harga: number;

  @ApiPropertyOptional({ description: "Harga asli sebelum diskon" })
  @IsNumber()
  @Min(0)
  @IsOptional()
  hargaAsli?: number;

  @ApiProperty({ description: "Satuan penjualan (e.g., kg, gram, ikat)" })
  @IsString()
  @IsNotEmpty()
  satuan: string;

  @ApiProperty({ description: "Stok awal produk (dalam kg/satuan)" })
  @IsNumber()
  @Min(0)
  stok: number;

  @ApiPropertyOptional({ description: "URL Gambar produk" })
  @IsString()
  @IsOptional()
  gambarUrl?: string;

  @ApiPropertyOptional({ description: "Kandungan nutrisi produk" })
  @IsString()
  @IsOptional()
  nutrisi?: string;

  @ApiPropertyOptional({ description: "Asal kebun/wilayah panen" })
  @IsString()
  @IsOptional()
  asalKebun?: string;

  @ApiPropertyOptional({ description: "Estimasi kesegaran dalam hari" })
  @IsNumber()
  @Min(1)
  @IsOptional()
  estimasiSegarHari?: number;

  @ApiPropertyOptional({
    description: "Status publikasi produk",
    enum: ["DRAFT", "ACTIVE", "INACTIVE", "OUT_OF_STOCK"],
  })
  @IsEnum(["DRAFT", "ACTIVE", "INACTIVE", "OUT_OF_STOCK"])
  @IsOptional()
  status?: "DRAFT" | "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK";

  @ApiPropertyOptional({ description: "Nama etalase kustom dari seller" })
  @IsString()
  @IsOptional()
  namaEtalase?: string;
}
