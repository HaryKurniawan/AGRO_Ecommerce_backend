import { IsEmail, IsOptional, IsString, IsEnum } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Peran } from "@prisma/client";

export class UpdateUserDto {
  @ApiPropertyOptional({ example: "updated@agrojabar.id" })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: "Jane Doe" })
  @IsString()
  @IsOptional()
  nama?: string;

  @ApiPropertyOptional({ enum: Peran })
  @IsEnum(Peran)
  @IsOptional()
  peran?: Peran;
}
