import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateCategoryDto {
  @ApiProperty({ description: "Nama unik kategori produk" })
  @IsString()
  @IsNotEmpty()
  nama: string;

  @ApiPropertyOptional({ description: "Tautan icon kategori" })
  @IsString()
  @IsOptional()
  icon?: string;
}
