import {
  IsString,
  IsNumber,
  IsPositive,
  IsDateString,
  IsOptional,
} from "class-validator";

export class CreateStokMasukDto {
  @IsString()
  produkId: string;

  @IsString()
  pengajuanStokId: string;

  @IsString()
  itemPengajuanStokId: string;

  @IsNumber()
  @IsPositive()
  jumlahMasuk: number;

  @IsNumber()
  @IsPositive()
  hargaBeli: number;

  @IsOptional()
  @IsDateString()
  tanggalMasuk?: string;

  @IsOptional()
  @IsString()
  varianKemasanId?: string;

  @IsOptional()
  @IsNumber()
  ukuranKemasanKg?: number;

  @IsOptional()
  @IsNumber()
  jumlahKemasanMasuk?: number;

  @IsOptional()
  @IsNumber()
  jumlahKemasanTersisa?: number;
}

export class UpdateBatchStockDto {
  @IsString()
  batchId: string;

  @IsNumber()
  @IsPositive()
  newQty: number;
}

export class ReturnStockToBatchDto {
  @IsString()
  batchId: string;

  @IsNumber()
  @IsPositive()
  qty: number;
}
