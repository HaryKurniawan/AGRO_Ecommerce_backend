import { IsString, IsNotEmpty, IsOptional, IsArray } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateStoreDto {
  @ApiProperty({ example: "Agro Bandung" })
  @IsString()
  @IsNotEmpty()
  nama: string;

  @ApiProperty({ example: "Kab. Bandung" })
  @IsString()
  @IsNotEmpty()
  kabupaten: string;

  @ApiProperty({ example: "Bandung Raya" })
  @IsString()
  @IsNotEmpty()
  wilayah: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  deskripsi?: string;

  @ApiProperty({ example: "Jl. Raya Soreang No. 45" })
  @IsString()
  @IsNotEmpty()
  alamat: string;

  @ApiProperty({ example: "022-5891234" })
  @IsString()
  @IsNotEmpty()
  telepon: string;

  @ApiPropertyOptional({ example: "06:00 - 20:00" })
  @IsString()
  @IsOptional()
  jamOperasional?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fotoUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bannerUrl?: string;

  @ApiPropertyOptional({ example: ["Brokoli", "Wortel"] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  komoditasUnggulan?: string[];
}
