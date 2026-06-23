import { IsString, IsNumber, IsOptional, IsEnum, Min, IsArray } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateProductDto {
  @ApiPropertyOptional({ description: "ID Kategori produk" })
  @IsString()
  @IsOptional()
  kategoriId?: string;

  @ApiPropertyOptional({ description: "Nama produk" })
  @IsString()
  @IsOptional()
  nama?: string;

  @ApiPropertyOptional({ description: "Deskripsi produk" })
  @IsString()
  @IsOptional()
  deskripsi?: string;

  @ApiPropertyOptional({ description: "Harga per kg/satuan" })
  @IsNumber()
  @Min(0)
  @IsOptional()
  harga?: number;

  @ApiPropertyOptional({ description: "Stok produk (diabaikan, update lewat endpoint stock)" })
  @IsNumber()
  @IsOptional()
  stok?: number;

  @ApiPropertyOptional({ description: "Harga asli sebelum diskon" })
  @IsNumber()
  @Min(0)
  @IsOptional()
  hargaAsli?: number;

  @ApiPropertyOptional({
    description: "Satuan penjualan (e.g., kg, gram, ikat)",
  })
  @IsString()
  @IsOptional()
  satuan?: string;

  @ApiPropertyOptional({ description: "URL Gambar produk" })
  @IsString()
  @IsOptional()
  gambarUrl?: string;

  @ApiPropertyOptional({ description: "Foto tambahan produk (array of URLs)" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fotoLainnya?: string[];

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

  @ApiPropertyOptional({ description: "Diskon persen" })
  @IsNumber()
  @Min(0)
  @IsOptional()
  diskonPersen?: number;
}
