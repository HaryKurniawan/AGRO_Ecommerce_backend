import { Injectable, BadRequestException } from "@nestjs/common";

import { ProdukEcomsRepository } from "../repositories/ecom-produks.repository";
import { FindProductByIdUseCase } from "./find-produk-by-id.usecase";


@Injectable()
export class UpdateStockUseCase {
  constructor(
    private readonly productsRepo: ProdukEcomsRepository,
    private readonly findProductByIdUC: FindProductByIdUseCase,
  ) {}

  async execute(
    id: string,
    penggunaId: string,
    data: {
      tipe: "IN" | "OUT" | "ADJUSTMENT";
      kuantitas: number;
      catatan?: string;
    },
  ) {
    const produk = await this.findProductByIdUC.execute(id);

    // Stock update logic
    let delta: number;
    if (data.tipe === "IN") delta = Math.abs(data.kuantitas);
    else if (data.tipe === "OUT") delta = -Math.abs(data.kuantitas);
    else delta = data.kuantitas - produk.stok;

    const stokAkhir = produk.stok + delta;
    if (stokAkhir < 0) {
      throw new BadRequestException(
        `Stok tidak cukup. Saat ini: ${produk.stok}`,
      );
    }

    const updated = await this.productsRepo.update({
      where: { id },
      data: {
        stok: stokAkhir,
        status:
          stokAkhir === 0
            ? "OUT_OF_STOCK"
            : produk.status === "OUT_OF_STOCK"
              ? "DRAFT"
              : (produk.status as any),
      },
      include: {
        kategori: { select: { id: true, nama: true } },
      },
    });

    await this.productsRepo.createStockHistory({
      data: {
        produkId: id,
        penggunaId,
        tipe: data.tipe,
        kuantitas: delta,
        stokAkhir,
        catatan: data.catatan,
      },
    });



    return updated;
  }
}
