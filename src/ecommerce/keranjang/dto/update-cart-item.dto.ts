import {
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsString,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateCartItemDto {
  @ApiProperty({ description: "Jumlah kuantitas baru produk", minimum: 1 })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  jumlah: number;

  @ApiPropertyOptional({ description: "ID Varian kemasan yang baru" })
  @IsString()
  @IsOptional()
  varianKemasanId?: string;
}
