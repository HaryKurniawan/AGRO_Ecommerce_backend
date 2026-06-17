import { IsOptional, IsString, IsBoolean } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class AdvanceShippingStatusDto {
  @ApiPropertyOptional({ description: "Catatan kemajuan status pengiriman" })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({ description: "ID Pengguna Kurir" })
  @IsString()
  @IsOptional()
  kurirPenggunaId?: string;

  @ApiPropertyOptional({ description: "Nama Kurir" })
  @IsString()
  @IsOptional()
  kurirName?: string;

  @ApiPropertyOptional({ description: "Nomor Telepon Kurir" })
  @IsString()
  @IsOptional()
  kurirPhone?: string;

  @ApiPropertyOptional({ description: "Kirim notifikasi email ke kurir" })
  @IsBoolean()
  @IsOptional()
  sendEmailNotification?: boolean;
}
