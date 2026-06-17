import { Injectable, BadRequestException } from "@nestjs/common";
import { StokMasukProduk } from "@prisma/client";

import { StokMasukRepository } from "../stok-masuk.repository";
import { CreateStokMasukUseCase } from "./create-stok-masuk.usecase";

@Injectable()
export class ProcessStockInFromPengajuanUseCase {
  constructor(
    private stokMasukRepository: StokMasukRepository,
    private createStokMasukUC: CreateStokMasukUseCase,
  ) {}

  async execute(
    pengajuanStokId: string,
    items: Array<{
      id: string;
      produkEcomId: string;
      jumlahDisetujui: number;
      hargaGudang: number;
      ukuranKemasanKg?: number;
    }>,
  ): Promise<StokMasukProduk[]> {
    const stokMasukRecords: StokMasukProduk[] = [];

    for (const item of items) {
      if (item.jumlahDisetujui > 0) {
        const ukuranKg = item.ukuranKemasanKg || 1.0;
        const totalKg = item.jumlahDisetujui * ukuranKg;

        const varian = await this.stokMasukRepository.findVarianKemasan(
          item.produkEcomId,
          ukuranKg,
        );

        const stokMasuk = await this.createStokMasukUC.execute({
          produkId: item.produkEcomId,
          pengajuanStokId,
          itemPengajuanStokId: item.id,
          jumlahMasuk: totalKg,
          hargaBeli: item.hargaGudang,
          varianKemasanId: varian?.id,
          ukuranKemasanKg: ukuranKg,
          jumlahKemasanMasuk: item.jumlahDisetujui,
          jumlahKemasanTersisa: item.jumlahDisetujui,
        });

        stokMasukRecords.push(stokMasuk);
      }
    }

    return stokMasukRecords;
  }
}
