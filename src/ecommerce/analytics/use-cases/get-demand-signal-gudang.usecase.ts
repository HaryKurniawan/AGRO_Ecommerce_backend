import { Injectable } from "@nestjs/common";

import { GetDemandSignalGudangQuery } from "../queries/get-demand-signal-gudang.query";

export interface DemandSignalItem {
  kodeKomoditasGlobal: string | null;
  komoditasNama: string;
  masterProdukId: string | null;
  jumlahTerjualKg: number;
  prevJumlahTerjualKg: number;
  totalRevenue: number;
  jumlahTransaksi: number;
  trendPersen: number | null;
  trendArah: "UP" | "DOWN" | "STABLE";
  jumlahSeller: number;
}

@Injectable()
export class GetDemandSignalGudangUseCase {
  constructor(private readonly query: GetDemandSignalGudangQuery) {}

  async execute(params: {
    gudangId: string;
    month?: number;
    year?: number;
    limit?: number;
  }): Promise<{
    gudangId: string;
    period: { month: number; year: number; label: string };
    prevPeriod: { label: string };
    totalTokoAfiliasi: number;
    data: DemandSignalItem[];
  }> {
    return this.query.execute(params);
  }
}
