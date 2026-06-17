import { IsOptional, IsString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class InitShippingDto {
  @ApiPropertyOptional({ description: "ID User Kurir yang ditugaskan" })
  @IsString()
  @IsOptional()
  kurirPenggunaId?: string;

  @ApiPropertyOptional({ description: "Nama Kurir manual" })
  @IsString()
  @IsOptional()
  kurirName?: string;

  @ApiPropertyOptional({ description: "No Telepon Kurir manual" })
  @IsString()
  @IsOptional()
  kurirPhone?: string;

  @ApiPropertyOptional({ description: "Catatan pengiriman tambahan" })
  @IsString()
  @IsOptional()
  catatan?: string;
}
