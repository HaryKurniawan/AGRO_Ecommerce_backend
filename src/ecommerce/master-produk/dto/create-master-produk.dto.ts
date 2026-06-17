import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateMasterProdukDto {
  @ApiProperty({ description: "Nama master produk" })
  @IsString()
  @IsNotEmpty()
  nama: string;

  @ApiProperty({ description: "Deskripsi standar produk" })
  @IsString()
  @IsNotEmpty()
  deskripsi: string;

  @ApiProperty({ description: "ID Kategori Toko" })
  @IsString()
  @IsNotEmpty()
  kategoriId: string;

  @ApiPropertyOptional({
    description: "Satuan standar (e.g. kg, ikat)",
    default: "kg",
  })
  @IsString()
  @IsOptional()
  satuan?: string;

  @ApiPropertyOptional({
    description: "Berat standar dalam gram",
    default: 1000,
  })
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

  @ApiPropertyOptional({
    description: "Estimasi kesegaran dalam hari",
    default: 3,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  estimasiSegarHari?: number;

  @ApiPropertyOptional({
    description: "Apakah status master produk aktif",
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: "Apakah seller boleh mengubah nama etalase",
    default: true,
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
