import { Injectable } from "@nestjs/common";
import { ProdukEcomsRepository } from "../repositories/ecom-produks.repository";

@Injectable()
export class CreateProductUseCase {
  constructor(
    private readonly productsRepo: ProdukEcomsRepository,
  ) {}

  async execute(
    tokoId: string,
    data: {
      kategoriId: string;
      nama: string;
      deskripsi: string;
      harga: number;
      hargaAsli?: number;
      satuan: string;
      stok: number;
      gambarUrl?: string;
      nutrisi?: string;
      asalKebun?: string;
      estimasiSegarHari?: number;
      status?: "DRAFT" | "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK";
    },
    penggunaId?: string,
  ) {
    const produk = await this.productsRepo.create({
      data: {
        tokoId,
        ...data,
        stokFisikKg: data.stok,
        stokTersediaKg: data.stok,
        status: data.status || "DRAFT",
      },
      include: { toko: { select: { nama: true } }, kategori: true },
    });

    if (data.stok > 0 && penggunaId) {
      await this.productsRepo.createStockHistory({
        data: {
          produkId: produk.id_produk,
          penggunaId,
          tipe: "IN",
          kuantitas: data.stok,
          stokAkhir: data.stok,
          catatan: "Stok awal saat produk dibuat",
        },
      });
    }

    return produk;
  }
}
