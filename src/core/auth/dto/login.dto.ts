import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsArray,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({ example: "admin@agrojabar.id" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: "password123" })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  kataSandi: string;

  @ApiPropertyOptional({
    example: ["GUDANG"],
    description: "Restrict login to specific roles (sent by each frontend app)",
  })
  @IsOptional()
  @IsArray()
  allowedRoles?: string[];
}
