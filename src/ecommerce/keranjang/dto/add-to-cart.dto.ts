import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  IsOptional,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AddToCartDto {
  @ApiProperty({ description: "ID Produk E-Commerce" })
  @IsString()
  @IsNotEmpty()
  produkId: string;

  @ApiProperty({
    description: "Kuantitas atau jumlah produk yang ditambahkan",
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  jumlah: number;

  @ApiProperty({ description: "ID Varian Kemasan (opsional)", required: false })
  @IsString()
  @IsOptional()
  varianKemasanId?: string;
}
