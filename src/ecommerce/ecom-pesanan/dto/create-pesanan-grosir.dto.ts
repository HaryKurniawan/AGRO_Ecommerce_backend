import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class WholesaleOrderItemDto {
  @ApiProperty({ description: "ID Produk" })
  @IsString()
  @IsNotEmpty()
  produkId: string;

  @ApiProperty({
    description: "Jumlah pembelian dalam kg/satuan (Grosir)",
    minimum: 300,
  })
  @IsNumber()
  @Min(300)
  jumlah: number;

  @ApiProperty({ description: "Harga satuan produk" })
  @IsNumber()
  @Min(0)
  harga: number;

  @ApiPropertyOptional({ description: "Catatan untuk item ini" })
  @IsString()
  @IsOptional()
  catatan?: string;
}

export class CreatePesananGrosirDto {
  @ApiProperty({
    type: [WholesaleOrderItemDto],
    description: "Daftar item pesanan grosir",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WholesaleOrderItemDto)
  item: WholesaleOrderItemDto[];

  @ApiPropertyOptional({
    description: "Metode Pembayaran (e.g., MANUAL, TRANSFER)",
  })
  @IsString()
  @IsOptional()
  metodeBayar?: string;

  @ApiPropertyOptional({ description: "Alamat pengiriman lengkap konsumen" })
  @IsString()
  @IsOptional()
  alamatKirim?: string;

  @ApiPropertyOptional({ description: "Catatan tambahan pesanan grosir" })
  @IsString()
  @IsOptional()
  catatan?: string;

  @ApiPropertyOptional({ description: "Biaya kirim tambahan" })
  @IsNumber()
  @Min(0)
  @IsOptional()
  ongkir?: number;
}
