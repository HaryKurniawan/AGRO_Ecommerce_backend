import { IsString, IsNotEmpty, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateMappingDto {
  @ApiProperty({ description: "ID Produk Gudang dari database GUDANG" })
  @IsString()
  @IsNotEmpty()
  produkGudangId: string;

  @ApiProperty({ description: "ID Gudang dari database GUDANG" })
  @IsString()
  @IsNotEmpty()
  gudangId: string;

  @ApiPropertyOptional({ description: "Nama gudang (snapshot)" })
  @IsString()
  @IsOptional()
  gudangNama?: string;
}
