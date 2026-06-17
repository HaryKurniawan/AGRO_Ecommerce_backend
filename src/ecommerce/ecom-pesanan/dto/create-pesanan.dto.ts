import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDateString,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class OrderItemDto {
  @ApiProperty({ description: "ID Produk" })
  @IsString()
  @IsNotEmpty()
  produkId: string;

  @ApiProperty({ description: "Jumlah pembelian dalam kg/satuan", minimum: 1 })
  @IsNumber()
  @Min(1)
  jumlah: number;

  @ApiProperty({ description: "Harga satuan produk" })
  @IsNumber()
  @Min(0)
  harga: number;

  @ApiPropertyOptional({ description: "ID Varian Kemasan jika ada" })
  @IsString()
  @IsOptional()
  varianKemasanId?: string;
}

export class StoreOrderDto {
  @ApiProperty({ description: "ID Toko asal pembelian" })
  @IsString()
  @IsNotEmpty()
  tokoId: string;

  @ApiProperty({ description: "Biaya kirim untuk toko ini" })
  @IsNumber()
  @Min(0)
  ongkir: number;

  @ApiPropertyOptional({ description: "Catatan untuk toko" })
  @IsString()
  @IsOptional()
  catatan?: string;

  @ApiPropertyOptional({ description: "Metode pengiriman (LOKAL | EKSPEDISI)" })
  @IsString()
  @IsOptional()
  metodeKirim?: string;

  @ApiProperty({
    type: [OrderItemDto],
    description: "Daftar produk yang dibeli",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  item: OrderItemDto[];
}

export class CreateOrderDto {
  @ApiProperty({
    description: "Metode Pembayaran (e.g., MANUAL, TRANSFER, COD)",
  })
  @IsString()
  @IsNotEmpty()
  metodeBayar: string;

  @ApiProperty({ description: "Alamat pengiriman lengkap konsumen" })
  @IsString()
  @IsNotEmpty()
  alamatKirim: string;

  @ApiPropertyOptional({ description: "Jadwal pengiriman terjadwal" })
  @IsDateString()
  @IsOptional()
  jadwalKirim?: string;

  @ApiProperty({
    type: [StoreOrderDto],
    description: "Daftar pesanan berdasarkan Toko",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoreOrderDto)
  pesanan: StoreOrderDto[];
}
