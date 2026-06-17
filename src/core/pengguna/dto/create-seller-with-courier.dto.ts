import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  ValidateNested,
  IsObject,
  IsNumber,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SellerCourierDataDto {
  @ApiProperty({ description: "Nama Lengkap Kurir" })
  @IsString()
  @IsNotEmpty()
  nama: string;

  @ApiProperty({ description: "Email unik Kurir" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: "Password Kurir" })
  @IsString()
  @IsNotEmpty()
  kataSandi: string;

  @ApiProperty({ description: "No Telepon Kurir" })
  @IsString()
  @IsNotEmpty()
  noTelepon: string;
}

export class CreateSellerWithCourierDto {
  @ApiProperty({ description: "Nama Lengkap Penjual (Toko)" })
  @IsString()
  @IsNotEmpty()
  nama: string;

  @ApiProperty({ description: "Email unik Penjual" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: "Password Penjual" })
  @IsString()
  @IsNotEmpty()
  kataSandi: string;

  @ApiProperty({ description: "No Telepon Penjual" })
  @IsString()
  @IsNotEmpty()
  noTelepon: string;

  @ApiPropertyOptional({ default: "PENJUAL" })
  @IsString()
  @IsOptional()
  peran?: string;

  // ── Store fields ──────────────────────────────────────────────────────────

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  storeName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  storeAddress?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  storeCity?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  storeProvince?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  storePhone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  storePostalCode?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  storeDescription?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  storeLat?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  storeLng?: number;

  // ── Courier flat fields (alternative to courierData object) ──────────────

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  courierOption?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  courierName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  courierEmail?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  courierPassword?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  courierPhone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  courierUserId?: string;

  // ── Nested courier object (legacy support) ────────────────────────────────

  @ApiPropertyOptional({ type: SellerCourierDataDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SellerCourierDataDto)
  courierData?: SellerCourierDataDto;
}
