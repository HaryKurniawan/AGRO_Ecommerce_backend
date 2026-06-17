import { Injectable, BadRequestException } from "@nestjs/common";

import { PengajuanStokRepository } from "../repositories/pengajuan-stok.repository";
import { TokosRepository } from "../../toko/repositories/tokos.repository";
import { ProductHistoryItem } from "../dto/product-history.dto";

@Injectable()
export class FindProductHistoryUseCase {
  constructor(
    private readonly stokRepo: PengajuanStokRepository,
    private readonly tokosRepo: TokosRepository,
  ) {}

  async execute(penggunaId: string): Promise<ProductHistoryItem[]> {
    try {
      // 1. Get seller profile and toko
      const profil = await this.tokosRepo.findSellerProfileByUserId(penggunaId);
      if (!profil) {
        console.warn(
          `[FindProductHistoryUseCase] Pengguna ${penggunaId} bukan penjual`,
        );
        throw new BadRequestException("Pengguna bukan penjual");
      }

      const toko = await this.tokosRepo.findUnique({
        where: { penjualId: profil.id },
      });

      if (!toko) {
        console.warn(
          `[FindProductHistoryUseCase] Toko tidak ditemukan untuk penjual ${profil.id}`,
        );
        throw new BadRequestException("Toko tidak ditemukan");
      }

      console.log(
        `[FindProductHistoryUseCase] Fetching pengajuan stok for toko ${toko.id}`,
      );

      // 2. Get all pengajuan stok with items, sorted by createdAt DESC
      const pengajuanList = await this.stokRepo.findMany({
        where: { tokoId: toko.id },
        include: {
          items: true,
        },
        orderBy: { createdAt: "desc" },
      });

      console.log(
        `[FindProductHistoryUseCase] Found ${pengajuanList.length} pengajuan stok`,
      );

      // 3. Flatten all items from all pengajuan, maintaining order (newest first)
      const allItems: ((typeof pengajuanList)[0]["items"][0] & {
        pengajuanId: string;
        pengajuanCreatedAt: Date;
        gudangId: string;
        pengajuanStatus: string;
      })[] = [];

      for (const pengajuan of pengajuanList) {
        console.log(
          `[FindProductHistoryUseCase] Processing pengajuan ${pengajuan.id} with ${pengajuan.items.length} items`,
        );
        for (const item of pengajuan.items) {
          allItems.push({
            ...item,
            pengajuanId: pengajuan.id,
            pengajuanCreatedAt: pengajuan.createdAt,
            gudangId: pengajuan.gudangId,
            pengajuanStatus: pengajuan.status,
          });
        }
      }

      console.log(
        `[FindProductHistoryUseCase] Total flattened items: ${allItems.length}`,
      );

      // 4. Convert to ProductHistoryItem format (one item per product instance)
      const result: ProductHistoryItem[] = allItems.map((item) => ({
        produkGudangId: item.produkGudangId,
        namaProduk: item.namaProduk || "Produk Tidak Diketahui",
        lastRequestDate: item.pengajuanCreatedAt,
        totalRequests: 1, // Each item is one request
        totalQuantityRequested: item.jumlahPermintaan,
        totalQuantityApproved: item.jumlahDisetujui || 0,
        lastStatus: item.pengajuanStatus,
        gudangId: item.gudangId,
      }));

      console.log(
        `[FindProductHistoryUseCase] Returning ${result.length} product history items`,
      );
      return result;
    } catch (error) {
      console.error("[FindProductHistoryUseCase] Error:", error);
      throw error;
    }
  }
}
