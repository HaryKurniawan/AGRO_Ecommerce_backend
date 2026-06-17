import { IsOptional, IsString, IsNumber, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class TrenKomoditasGlobalFilterDto {
  @ApiPropertyOptional({
    description: "Filter kode komoditas tertentu (e.g. WORTEL)",
  })
  @IsOptional()
  @IsString()
  kodeKomoditasGlobal?: string;

  @ApiPropertyOptional({
    description: "Bulan ke-N yang dibandingkan (minimal 2)",
    default: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(2)
  bulanKe?: number;
}

export interface TrenKomoditasGlobalItem {
  kodeKomoditasGlobal: string;
  komoditasNama: string;
  jumlahTerjualKgBulanIni: number;
  jumlahTerjualKgBulanLalu: number;
  trendArah: "UP" | "DOWN" | "STABLE";
  trendPersen: number | null;
  hargaJualRataRataPerKg: number;
  jumlahSellerMenjual: number;
}

export interface TrenKomoditasGlobalResponse {
  periode: string;
  periodeSebelumnya: string;
  generatedAt: string;
  data: TrenKomoditasGlobalItem[];
}
