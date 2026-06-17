import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsEnum,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Peran } from "@prisma/client";

export class CreateUserDto {
  @ApiProperty({ example: "pengguna@agrojabar.id" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: "password123", minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  kataSandi: string;

  @ApiProperty({ example: "John Doe" })
  @IsString()
  @IsNotEmpty()
  nama: string;

  @ApiPropertyOptional({ enum: Peran, example: Peran.KONSUMEN })
  @IsEnum(Peran)
  @IsOptional()
  peran?: Peran;

  @ApiPropertyOptional({ example: "uuid-of-gudang" })
  @IsString()
  @IsOptional()
  gudangId?: string;

  @ApiPropertyOptional({ example: "08123456789" })
  @IsString()
  @IsOptional()
  noTelepon?: string;

  @ApiPropertyOptional({
    description: "Data kurir (Wajib diisi jika mendaftar sebagai PENJUAL)",
  })
  @IsOptional()
  courierData?: any; // Dibiarkan any dulu agar fleksibel menerima payload kurir
}
