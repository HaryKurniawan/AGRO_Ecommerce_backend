import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";

import { TokosRepository } from "../../toko/repositories/tokos.repository";
import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class FindProdukForPengajuanUseCase {
  constructor(
    private readonly tokosRepo: TokosRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(penggunaId: string, gudangId: string, all = false) {
    try {
      // 1. Verify user is seller
      const profil = await this.tokosRepo.findSellerProfileByUserId(penggunaId);
      if (!profil) {
        throw new BadRequestException(
          "Anda tidak memiliki profil penjual. Silakan hubungi administrator untuk mengaktifkan akun penjual Anda.",
        );
      }

      // 2. Find store
      const toko = await this.tokosRepo.findUnique({
        where: { penjualId: profil.id },
      });

      if (!toko) {
        throw new NotFoundException(
          "Toko Anda belum terdaftar. Silakan lengkapi profil toko terlebih dahulu atau hubungi administrator.",
        );
      }

      // 3. ✅ OPEN MARKETPLACE: No affiliation check required
      // Any seller can request products from any warehouse
      console.log(
        `[FindProdukForPengajuan] Open marketplace mode - no affiliation check`,
      );

      // 4. ✅ Fetch products from GUDANG backend API
      const gudangApiUrl =
        process.env.GUDANG_API_URL ||
        process.env.PROCESSING_SERVICE_URL ||
        "http://localhost:5005";
      const endpoint = `${gudangApiUrl}/api/produk/affiliate?gudangId=${gudangId}&tokoId=${toko.id}`;

      console.log(`[FindProdukForPengajuan] Fetching from: ${endpoint}`);
      console.log(
        `[FindProdukForPengajuan] Toko ID: ${toko.id}, Gudang ID: ${gudangId}`,
      );

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-api-key":
            process.env.ECOMMERCE_API_KEY ||
            "ecommerce-nestjs-to-gudang-express-secure-key",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[FindProdukForPengajuan] API Error:`, {
          status: response.status,
          statusText: response.statusText,
          endpoint,
          errorData,
        });
        throw new BadRequestException(
          errorData.message ||
            `Gagal mengambil daftar produk dari gudang (${response.status})`,
        );
      }

      const data = await response.json();

      console.log(`[FindProdukForPengajuan] Response received:`, {
        statusCode: data.statusCode,
        hasData: !!data.data,
        productsCount: data.data?.products?.length || 0,
      });

      // ✅ Handle different response formats from GUDANG API
      let products = [];

      if (data.data?.products && Array.isArray(data.data.products)) {
        products = data.data.products;
      } else if (data.data && Array.isArray(data.data)) {
        products = data.data;
      } else if (Array.isArray(data)) {
        products = data;
      }

      console.log(
        `[FindProdukForPengajuan] Mapped source warehouse products: ${products.length}`,
      );

      // 5. ✅ Query active mappings for this gudang
      const mappings = await this.prisma.mappingProdukGudang.findMany({
        where: {
          gudangId: gudangId,
          masterProduk: {
            isActive: true,
          },
        },
        include: {
          masterProduk: {
            include: {
              kategori: true,
            },
          },
        },
      });

      console.log(
        `[FindProdukForPengajuan] Found ${mappings.length} master mappings for gudang: ${gudangId}`,
      );

      // 6. ✅ Map and filter the results
      const enrichedProducts = products
        .map((warehouseProduct) => {
          const mapping = mappings.find(
            (m) => m.produkGudangId === warehouseProduct.id,
          );
          if (mapping) {
            return {
              id: warehouseProduct.id,
              produkGudangId: warehouseProduct.id,
              nama: mapping.masterProduk.nama, // Use standard master name
              varianProduk: warehouseProduct.varianProduk || null, // Pass through variant from warehouse
              deskripsi: mapping.masterProduk.deskripsi, // Use standard master description
              satuan: mapping.masterProduk.satuan, // Use standard master unit
              hargaGudang: warehouseProduct.hargaGudang, // Use live warehouse price
              minimalPembelianKg: warehouseProduct.minimalPembelianKg || 300,
              gambarUrl:
                mapping.masterProduk.gambarUrl || warehouseProduct.gambarUrl, // Standard image preferred
              masterProdukId: mapping.masterProduk.id,
              kategoriId: mapping.masterProduk.kategoriId,
              kategoriNama: mapping.masterProduk.kategori.nama,
              allowCustomName: mapping.masterProduk.allowCustomName,
              namaWajibMengandung: mapping.masterProduk.namaWajibMengandung,
              isStandard: true,
            };
          }

          if (all) {
            return {
              id: warehouseProduct.id,
              produkGudangId: warehouseProduct.id,
              nama: warehouseProduct.nama,
              varianProduk: warehouseProduct.varianProduk || null, // Pass through variant from warehouse
              deskripsi: warehouseProduct.deskripsi || "",
              satuan: warehouseProduct.satuan || "kg",
              hargaGudang: warehouseProduct.hargaGudang,
              minimalPembelianKg: warehouseProduct.minimalPembelianKg || 300,
              gambarUrl: warehouseProduct.gambarUrl,
              masterProdukId: null,
              isStandard: false,
            };
          }

          return null;
        })
        .filter((p) => p !== null);

      console.log(
        `[FindProdukForPengajuan] Returning ${enrichedProducts.length} products (all=${all})`,
      );

      return enrichedProducts;
    } catch (error) {
      // Re-throw known errors
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // Log unexpected errors and throw generic message
      console.error("Error in FindProdukForPengajuanUseCase:", error);
      throw new BadRequestException(
        "Terjadi kesalahan saat mengambil daftar produk. Silakan coba lagi atau hubungi administrator.",
      );
    }
  }
}
