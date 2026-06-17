import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateProductStockDto {
  @ApiProperty({
    description: "Tipe penyesuaian stok",
    enum: ["IN", "OUT", "ADJUSTMENT"],
  })
  @IsEnum(["IN", "OUT", "ADJUSTMENT"])
  @IsNotEmpty()
  tipe: "IN" | "OUT" | "ADJUSTMENT";

  @ApiProperty({
    description: "Kuantitas penyesuaian (dalam kg/satuan)",
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  kuantitas: number;

  @ApiPropertyOptional({ description: "Catatan mengapa stok disesuaikan" })
  @IsString()
  @IsOptional()
  catatan?: string;
}
