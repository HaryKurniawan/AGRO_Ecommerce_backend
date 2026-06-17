import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateMasterProdukDto {
  @ApiPropertyOptional({ description: "Nama master produk" })
  @IsString()
  @IsOptional()
  nama?: string;

  @ApiPropertyOptional({ description: "Deskripsi standar produk" })
  @IsString()
  @IsOptional()
  deskripsi?: string;

  @ApiPropertyOptional({ description: "ID Kategori Toko" })
  @IsString()
  @IsOptional()
  kategoriId?: string;

  @ApiPropertyOptional({ description: "Satuan standar (e.g. kg, ikat)" })
  @IsString()
  @IsOptional()
  satuan?: string;

  @ApiPropertyOptional({ description: "Berat standar dalam gram" })
  @IsNumber()
  @Min(0)
  @IsOptional()
  beratGram?: number;

  @ApiPropertyOptional({ description: "URL Gambar produk utama" })
  @IsString()
  @IsOptional()
  gambarUrl?: string;

  @ApiPropertyOptional({
    description: "Daftar URL gambar lainnya",
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fotoLainnya?: string[];

  @ApiPropertyOptional({ description: "Kandungan nutrisi standar" })
  @IsString()
  @IsOptional()
  nutrisi?: string;

  @ApiPropertyOptional({ description: "Estimasi kesegaran dalam hari" })
  @IsNumber()
  @Min(1)
  @IsOptional()
  estimasiSegarHari?: number;

  @ApiPropertyOptional({ description: "Apakah status master produk aktif" })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: "Apakah seller boleh mengubah nama etalase",
  })
  @IsBoolean()
  @IsOptional()
  allowCustomName?: boolean;

  @ApiPropertyOptional({
    description: "Kata/frasa yang wajib terkandung di nama etalase seller",
  })
  @IsString()
  @IsOptional()
  namaWajibMengandung?: string;
}
