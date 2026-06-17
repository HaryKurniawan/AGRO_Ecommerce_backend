import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class KonfirmasiPesananGrosirDto {
  @ApiProperty({ description: "Apakah pesanan grosir diterima atau ditolak" })
  @IsBoolean()
  @IsNotEmpty()
  terima: boolean;

  @ApiPropertyOptional({
    description: "Penyesuaian biaya kirim baru dari seller",
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  ongkirBaru?: number;

  @ApiPropertyOptional({ description: "Catatan tambahan dari seller" })
  @IsString()
  @IsOptional()
  catatanSeller?: string;
}
