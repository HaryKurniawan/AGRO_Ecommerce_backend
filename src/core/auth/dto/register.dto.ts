import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Peran } from "@prisma/client";

export class RegisterDto {
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
}
