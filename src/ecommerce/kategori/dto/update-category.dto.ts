import { IsOptional, IsString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: "Nama kategori produk baru" })
  @IsString()
  @IsOptional()
  nama?: string;

  @ApiPropertyOptional({ description: "Tautan icon kategori baru" })
  @IsString()
  @IsOptional()
  icon?: string;
}
