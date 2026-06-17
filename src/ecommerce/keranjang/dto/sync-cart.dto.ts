import { Type } from "class-transformer";
import {
  IsArray,
  ValidateNested,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  IsOptional,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SyncCartItemDto {
  @ApiProperty({ description: "ID Produk E-Commerce" })
  @IsString()
  @IsNotEmpty()
  produkId: string;

  @ApiProperty({ description: "Jumlah produk", minimum: 1 })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  jumlah: number;

  @ApiProperty({ description: "ID Varian Kemasan (opsional)", required: false })
  @IsString()
  @IsOptional()
  varianKemasanId?: string;
}

export class SyncCartDto {
  @ApiProperty({
    description: "Daftar item dari guest cart (local storage) untuk disinkronisasikan",
    type: [SyncCartItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncCartItemDto)
  items: SyncCartItemDto[];

  @ApiProperty({
    description: "Kota yang dipilih oleh guest (opsional)",
    required: false,
  })
  @IsString()
  @IsOptional()
  kotaPilihan?: string;
}
