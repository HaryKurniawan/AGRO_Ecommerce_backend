import { Injectable, BadRequestException } from "@nestjs/common";

import { ProdukEcomsRepository } from "../repositories/ecom-produks.repository";
import { FindProductByIdUseCase } from "./find-produk-by-id.usecase";


@Injectable()
export class UpdateProductUseCase {
  constructor(
    private readonly productsRepo: ProdukEcomsRepository,
    private readonly findProductByIdUC: FindProductByIdUseCase,
  ) {}

  async execute(id: string, data: Record<string, unknown>, penggunaId?: string) {
    const product = await this.productsRepo.findUnique({
      where: { id_produk: id },
      include: {
        masterProduk: true,
      },
    });

    if (!product) {
      throw new BadRequestException("Produk tidak ditemukan.");
    }

    const { stok, ...safeData } = data;
    void stok;

    // Enforce custom etalase name constraints on standardized products
    if (product.masterProduk && "namaEtalase" in safeData) {
      const namaEtalase = safeData.namaEtalase as string | null;
      if (namaEtalase) {
        if (!product.masterProduk.allowCustomName) {
          throw new BadRequestException(
            "Produk terstandarisasi ini tidak mengizinkan kustomisasi nama etalase.",
          );
        }

        const keyword = (
          product.masterProduk.namaWajibMengandung || product.masterProduk.nama
        ).toLowerCase();
        if (!namaEtalase.toLowerCase().includes(keyword)) {
          throw new BadRequestException(
            `Nama etalase wajib mengandung kata "${product.masterProduk.namaWajibMengandung || product.masterProduk.nama}".`,
          );
        }
      }
    }

    if (
      "diskonPersen" in safeData &&
      safeData.diskonPersen !== null &&
      safeData.diskonPersen !== undefined
    ) {
      const diskon = Number(safeData.diskonPersen);
      if (!Number.isInteger(diskon) || diskon < 0 || diskon > 30) {
        throw new BadRequestException(
          "Diskon hanya boleh antara 0% sampai 30%. Nilai harus bilangan bulat.",
        );
      }
      if (diskon > 0 && diskon < 5) {
        throw new BadRequestException(
          "Diskon minimal 5% jika aktif. Gunakan 0 untuk menghapus diskon.",
        );
      }
      safeData.diskonPersen = diskon === 0 ? null : diskon;
    }

    const updated = await this.productsRepo.update({
      where: { id_produk: id },
      data: safeData,
    });

    if (penggunaId && "harga" in safeData) {
      await this.productsRepo.createStockHistory({
        data: {
          produkId: id,
          penggunaId,
          tipe: "ADJUSTMENT",
          kuantitas: 0,
          stokAkhir: updated.stok,
          catatan: `Perubahan harga menjadi Rp ${Number(safeData.harga).toLocaleString("id-ID")}`,
        },
      });
    }

    // Invalidate caches


    return updated;
  }
}
