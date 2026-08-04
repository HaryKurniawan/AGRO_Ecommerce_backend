import { Injectable, NotFoundException } from "@nestjs/common";
import { StatusPengajuanStok } from "@prisma/client";

import { PengajuanStokRepository } from "../repositories/pengajuan-stok.repository";
import { ProdukEcomsRepository } from "../../ecom-produk/repositories/ecom-produks.repository";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { StokMasukService } from "../../stok-masuk/stok-masuk.service";

@Injectable()
export class UpdatePengajuanStokStatusUseCase {
  constructor(
    private readonly stokRepo: PengajuanStokRepository,
    private readonly productsRepo: ProdukEcomsRepository,
    private readonly prisma: PrismaService,
    private readonly stokMasukService: StokMasukService,
  ) {}

  async execute(
    penggunaId: string, // Admin / Warehouse staff ID
    pengajuanId: string,
    data: {
      status: StatusPengajuanStok;
      catatan?: string;
      itemUpdates?: {
        itemId?: string;
        produkGudangId?: string; // ✅ Changed from produkId
        jumlahDisetujui: number;
        kemasanDetail?: {
          ukuranKg: number;
          jumlahKemasan: number;
        }[];
      }[];
    },
  ) {
    const pengajuan = await this.stokRepo.findUnique({
      where: { id_pengajuanStok: pengajuanId },
      include: {
        items: true,
        toko: {
          include: {
            penjual: true,
          },
        },
      },
    });

    if (!pengajuan) {
      throw new NotFoundException("Pengajuan stok tidak ditemukan");
    }

    const effectivePenggunaId =
      penggunaId === "system-gudang-service"
        ? pengajuan.toko?.penjual?.penggunaId || penggunaId
        : penggunaId;

    // Business Logic: If status is being set to KONFIRMASI_DITERIMA or SELESAI, we increment the store's inventory and calculate HPP
    if (
      (data.status === ("KONFIRMASI_DITERIMA" as StatusPengajuanStok) ||
        data.status === ("SELESAI" as StatusPengajuanStok)) &&
      pengajuan.status !== ("KONFIRMASI_DITERIMA" as StatusPengajuanStok) &&
      pengajuan.status !== ("SELESAI" as StatusPengajuanStok)
    ) {
      console.log(
        `[UpdatePengajuanStokStatus] Processing receiving items for pengajuan ${pengajuanId}`,
      );

      // Fetch store price configuration (fallback to 15%)
      let marginDefault = 15.0;
      const tokoConfig = await this.stokRepo.findPriceConfigByTokoId(
        pengajuan.tokoId,
      );
      if (tokoConfig) {
        marginDefault = tokoConfig.marginDefaultPersen;
      }

      await this.processReceivingItems(
        pengajuan,
        data.itemUpdates,
        marginDefault,
        effectivePenggunaId,
      );

      await this.createFifoBatches(pengajuan, data.itemUpdates);

      // After processing all items, auto-transition to SELESAI
      // This ensures products are immediately available in the catalog
      data.status = "SELESAI" as StatusPengajuanStok;
      console.log(
        `[UpdatePengajuanStokStatus] Auto-transitioning to SELESAI after processing items`,
      );
    }

    // Update the items with approved quantities if provided
    await this.updateApprovedQuantities(pengajuan, data.itemUpdates);

    const updated = await this.stokRepo.update({
      where: { id_pengajuanStok: pengajuanId },
      data: {
        status: data.status,
        catatan: data.catatan,
      },
      include: {
        items: {
          include: {
            kemasanDetail: true,
          },
        },
        toko: true,
      },
    });

    if (data.status === "SELESAI") {
      try {
        const gudangApiUrl = process.env.GUDANG_API_URL || "http://localhost:5005";
        const apiKey = process.env.ECOMMERCE_API_KEY || "ecommerce-nestjs-to-gudang-express-secure-key";
        const response = await fetch(`${gudangApiUrl}/api/pengajuan/webhook/from-ecommerce/${pengajuanId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          },
          body: JSON.stringify({ status: data.status, catatan: data.catatan })
        });
        if (!response.ok) {
          console.error(`[UpdatePengajuanStokStatus] Webhook error ${response.status}:`, await response.text());
        } else {
          console.log(`[UpdatePengajuanStokStatus] Successfully notified Gudang of SELESAI status`);
        }
      } catch (err) {
        console.error("[UpdatePengajuanStokStatus] Failed to notify Gudang:", err);
      }
    }

    return updated;
  }

  // --- Private Helper Methods ---

  private async processReceivingItems(
    pengajuan: any,
    itemUpdates: any[] | undefined,
    marginDefault: number,
    effectivePenggunaId: string,
  ) {
    for (const item of pengajuan.items) {
      const updatePayload = itemUpdates?.find(
        (u) => u.itemId === item.id_itemPengajuan || u.produkGudangId === item.produkGudangId,
      );
      // ✅ Prioritas: dari itemUpdates → jumlahDisetujui di item → jumlahPermintaan (fallback terakhir)
      const approvedQty =
        updatePayload?.jumlahDisetujui ??
        item.jumlahDisetujui ??
        item.jumlahPermintaan;

      if (approvedQty <= 0) continue;

      const master = await this.resolveMasterMapping(item, pengajuan.gudangId);

      const packagesToProcess = this.extractPackagingBreakdown(
        item,
        updatePayload,
        approvedQty,
      );

      await this.upsertProdukAndInventory(
        pengajuan,
        item,
        master,
        packagesToProcess,
        marginDefault,
        effectivePenggunaId,
      );
    }
  }

  private async resolveMasterMapping(item: any, gudangId: string) {
    let mapping = await this.prisma.mappingProdukGudang.findFirst({
      where: {
        produkGudangId: item.produkGudangId,
        gudangId: gudangId,
      },
      include: {
        masterProduk: true,
      },
    });

    if (!mapping || !mapping.masterProduk) {
      console.log(
        `[UpdatePengajuanStokStatus] Mapping not found for item ${item.produkGudangId}. Attempting auto-creation.`,
      );

      const fullName = item.varianProduk ? `${item.namaProduk} - ${item.varianProduk}` : item.namaProduk;

      let masterProduk = await this.prisma.masterProduk.findFirst({
        where: { nama: fullName },
      });

      if (!masterProduk) {
        console.log(
          `[UpdatePengajuanStokStatus] Creating MasterProduk: ${fullName}`,
        );

        let kategoriNama = "Sayuran";
        try {
          const gudangApiUrl = process.env.GUDANG_API_URL || "http://localhost:5005";
          const res = await fetch(`${gudangApiUrl}/api/produk/affiliate?gudangId=${gudangId}`);
          if (res.ok) {
            const data = await res.json();
            const gudangProduk = data.data?.products?.find((p: any) => p.id === item.produkGudangId);
            if (gudangProduk && gudangProduk.kategori && gudangProduk.kategori.nama) {
               kategoriNama = gudangProduk.kategori.nama;
            }
          }
        } catch (e) {
          console.error("Gagal mengambil kategori dari gudang:", e);
        }

        let kategori = await this.prisma.kategoriToko.findFirst({
          where: { nama: { equals: kategoriNama, mode: 'insensitive' } },
        });

        if (!kategori) {
          kategori = await this.prisma.kategoriToko.create({
            data: { nama: kategoriNama, icon: "📦" },
          });
        }

        masterProduk = await this.prisma.masterProduk.create({
          data: {
            nama: fullName,
            slug: fullName
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[^a-z0-9-]/g, ""),
            deskripsi: `${fullName} berkualitas dari gudang`,
            kategoriId: kategori.id_kategoriToko,
            satuan: item.satuan || "kg",
            allowCustomName: true,
            namaWajibMengandung: item.namaProduk.split(" ")[0],
            isActive: true,
          },
        });
        console.log(
          `[UpdatePengajuanStokStatus] MasterProduk auto-created: ${masterProduk.id_masterProduk}`,
        );
      }

      mapping = await this.prisma.mappingProdukGudang.create({
        data: {
          masterProdukId: masterProduk.id_masterProduk,
          produkGudangId: item.produkGudangId,
          gudangId: gudangId,
          gudangNama: "Gudang Utama",
        },
        include: { masterProduk: true },
      });
      console.log(
        `[UpdatePengajuanStokStatus] Mapping auto-created: ${mapping.produkGudangId} → ${masterProduk.nama}`,
      );
    }

    return mapping.masterProduk;
  }

  private extractPackagingBreakdown(
    item: any,
    updatePayload: any,
    approvedQty: number,
  ) {
    const packagesToProcess: { ukuranKg: number; jumlahKemasan: number }[] = [];
    if (
      updatePayload &&
      updatePayload.kemasanDetail &&
      updatePayload.kemasanDetail.length > 0
    ) {
      packagesToProcess.push(
        ...updatePayload.kemasanDetail.map((k: any) => ({
          ukuranKg: Number(k.ukuranKg),
          jumlahKemasan: Number(k.jumlahKemasan),
        })),
      );
    } else if (item.kemasanDetail && item.kemasanDetail.length > 0) {
      packagesToProcess.push(
        ...item.kemasanDetail.map((k: any) => ({
          ukuranKg: Number(k.ukuranKg),
          jumlahKemasan: Number(k.jumlahKemasan),
        })),
      );
    } else {
      packagesToProcess.push({
        ukuranKg: 1.0,
        jumlahKemasan: approvedQty,
      });
    }
    return packagesToProcess;
  }

  private async upsertProdukAndInventory(
    pengajuan: any,
    item: any,
    master: any,
    packagesToProcess: { ukuranKg: number; jumlahKemasan: number }[],
    marginDefault: number,
    effectivePenggunaId: string,
  ) {
    let totalKgAdded = 0;
    for (const pkg of packagesToProcess) {
      totalKgAdded += pkg.ukuranKg * pkg.jumlahKemasan;
    }

    await this.prisma.itemPengajuanStokKemasan.deleteMany({
      where: { itemPengajuanStokId: item.id_itemPengajuan },
    });

    if (packagesToProcess.length > 0) {
      await this.prisma.itemPengajuanStokKemasan.createMany({
        data: packagesToProcess.map((pkg) => ({
          itemPengajuanStokId: item.id_itemPengajuan,
          ukuranKg: pkg.ukuranKg,
          jumlahKemasan: pkg.jumlahKemasan,
        })),
      });
    }

    const existingProduct = await this.prisma.produkEcom.findFirst({
      where: {
        tokoId: pengajuan.tokoId,
        masterProdukId: master.id_masterProduk,
      },
    });

    let product;

    if (existingProduct) {
      const newStok = existingProduct.stok + totalKgAdded;
      const currentMargin =
        existingProduct.marginPersen !== null
          ? existingProduct.marginPersen
          : marginDefault;
      const newHarga = item.hargaGudang * (1 + currentMargin / 100);

      product = await this.prisma.produkEcom.update({
        where: { id_produk: existingProduct.id_produk },
        data: {
          stok: newStok,
          stokFisikKg: { increment: totalKgAdded },
          stokTersediaKg: { increment: totalKgAdded },
          hargaBeli: item.hargaGudang,
          harga: newHarga,
          status: "ACTIVE",
        },
      });

      console.log(
        `[UpdatePengajuanStokStatus] Updated existing product ${product.id_produk} (Toko: ${pengajuan.tokoId}) with ${totalKgAdded}kg new stock. New total: ${newStok}kg.`,
      );

      await this.prisma.riwayatStokProduk.create({
        data: {
          produkId: product.id_produk,
          penggunaId: effectivePenggunaId,
          tipe: "IN",
          kuantitas: Math.round(totalKgAdded),
          stokAkhir: newStok,
          catatan: `Stok masuk dari pengajuan ${pengajuan.id_pengajuanStok} - ${item.namaProduk} (${totalKgAdded} Kg)`,
        },
      });
    } else {
      const sellingPrice = item.hargaGudang * (1 + marginDefault / 100);

      product = await this.prisma.produkEcom.create({
        data: {
          tokoId: pengajuan.tokoId,
          kategoriId: master.kategoriId,
          masterProdukId: master.id_masterProduk,
          nama: master.nama,
          namaEtalase: null,
          deskripsi: master.deskripsi,
          satuan: master.satuan,
          beratGram: master.beratGram,
          stok: totalKgAdded,
          stokFisikKg: totalKgAdded,
          stokTersediaKg: totalKgAdded,
          gambarUrl: master.gambarUrl,
          fotoLainnya: master.fotoLainnya,
          nutrisi: master.nutrisi,
          estimasiSegarHari: master.estimasiSegarHari,
          hargaBeli: item.hargaGudang,
          marginPersen: null,
          harga: sellingPrice,
          status: "INACTIVE",
        },
      });

      console.log(
        `[UpdatePengajuanStokStatus] Auto-created new standardized product ${product.id_produk} with initial stock: ${totalKgAdded}kg.`,
      );

      await this.prisma.riwayatStokProduk.create({
        data: {
          produkId: product.id_produk,
          penggunaId: effectivePenggunaId,
          tipe: "IN",
          kuantitas: Math.round(totalKgAdded),
          stokAkhir: Math.round(totalKgAdded),
          catatan: `Produk baru dari pengajuan ${pengajuan.id_pengajuanStok} - ${item.namaProduk} (${totalKgAdded} Kg)`,
        },
      });
    }

    for (const pkg of packagesToProcess) {
      await this.prisma.varianKemasan.upsert({
        where: {
          produkId_ukuranKg: {
            produkId: product.id_produk,
            ukuranKg: pkg.ukuranKg,
          },
        },
        create: {
          produkId: product.id_produk,
          ukuranKg: pkg.ukuranKg,
          biayaTambahan: 0, // Default no extra packaging fee
          stokKemasan: pkg.jumlahKemasan,
          isActive: true,
        },
        update: {
          stokKemasan: { increment: pkg.jumlahKemasan },
        },
      });
    }

  }

  private async createFifoBatches(
    pengajuan: any,
    itemUpdates: any[] | undefined,
  ) {
    console.log(
      `[UpdatePengajuanStokStatus] Creating FIFO stock batches for pengajuan ${pengajuan.id_pengajuanStok}`,
    );

    const stokMasukItems: Array<{
      id_itemPengajuan: string;
      produkEcomId: string;
      jumlahDisetujui: number;
      hargaGudang: number;
      ukuranKemasanKg: number;
      estimasiSegarHari?: number;
    }> = [];

    for (const item of pengajuan.items) {
      const updatePayload = itemUpdates?.find(
        (u) => u.itemId === item.id_itemPengajuan || u.produkGudangId === item.produkGudangId,
      );

      let produkEcomId = "";
      let estimasiSegarHari = 3; // Default 3 hari
      const mapping = await this.prisma.mappingProdukGudang.findFirst({
        where: {
          produkGudangId: item.produkGudangId,
          gudangId: pengajuan.gudangId,
        },
      });

      if (mapping) {
        const product = await this.prisma.produkEcom.findFirst({
          where: {
            tokoId: pengajuan.tokoId,
            masterProdukId: mapping.masterProdukId,
          },
        });
        if (product) {
          produkEcomId = product.id_produk;
          estimasiSegarHari = product.estimasiSegarHari;
        }
      }

      if (!produkEcomId) continue;

      const packages: { ukuranKg: number; jumlahKemasan: number }[] = [];
      if (
        updatePayload &&
        updatePayload.kemasanDetail &&
        updatePayload.kemasanDetail.length > 0
      ) {
        packages.push(
          ...updatePayload.kemasanDetail.map((k: any) => ({
            ukuranKg: Number(k.ukuranKg),
            jumlahKemasan: Number(k.jumlahKemasan),
          })),
        );
      } else if (item.kemasanDetail && item.kemasanDetail.length > 0) {
        packages.push(
          ...item.kemasanDetail.map((k: any) => ({
            ukuranKg: Number(k.ukuranKg),
            jumlahKemasan: Number(k.jumlahKemasan),
          })),
        );
      } else {
        const approvedQty =
          updatePayload?.jumlahDisetujui ??
          item.jumlahDisetujui ??
          item.jumlahPermintaan;
        if (approvedQty > 0) {
          packages.push({
            ukuranKg: 1.0,
            jumlahKemasan: approvedQty,
          });
        }
      }

      for (const pkg of packages) {
        if (pkg.jumlahKemasan > 0) {
          stokMasukItems.push({
            id_itemPengajuan: item.id_itemPengajuan,
            produkEcomId: produkEcomId,
            jumlahDisetujui: pkg.jumlahKemasan,
            hargaGudang: item.hargaGudang,
            ukuranKemasanKg: pkg.ukuranKg,
            estimasiSegarHari: estimasiSegarHari,
          });
        }
      }
    }

    if (stokMasukItems.length > 0) {
      try {
        await this.stokMasukService.processStockInFromPengajuan(
          pengajuan.id_pengajuanStok,
          stokMasukItems,
        );
        console.log(
          `[UpdatePengajuanStokStatus] Created ${stokMasukItems.length} FIFO stock batches`,
        );
      } catch (error) {
        console.error(
          `[UpdatePengajuanStokStatus] Error creating FIFO stock batches:`,
          error,
        );
      }
    }
  }

  private async updateApprovedQuantities(
    pengajuan: any,
    itemUpdates: any[] | undefined,
  ) {
    if (!itemUpdates) return;

    for (const update of itemUpdates) {
      let targetItemId: string | undefined;

      if (update.produkGudangId) {
        const matchedItem = pengajuan.items.find(
          (it: any) => it.produkGudangId === update.produkGudangId,
        );
        if (matchedItem) targetItemId = matchedItem.id;
      }

      if (!targetItemId && update.itemId) {
        const byId = pengajuan.items.find((it: any) => it.id_itemPengajuan === update.itemId);
        if (byId) targetItemId = byId.id_itemPengajuan;
      }

      if (targetItemId) {
        await this.stokRepo.updateItem({
          where: { id_itemPengajuan: targetItemId },
          data: {
            jumlahDisetujui: update.jumlahDisetujui,
          },
        });
      }
    }
  }
}
