import { IsOptional, IsString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class CompleteProfileDto {
  @ApiPropertyOptional({ description: "Nama Lengkap pengguna" })
  @IsString()
  @IsOptional()
  nama?: string;

  @ApiPropertyOptional({ description: "No Telepon aktif pengguna" })
  @IsString()
  @IsOptional()
  noTelepon?: string;
}
