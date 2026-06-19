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
      where: { id: pengajuanId },
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

    return this.stokRepo.update({
      where: { id: pengajuanId },
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
        (u) => u.itemId === item.id || u.produkGudangId === item.produkGudangId,
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

      let masterProduk = await this.prisma.masterProduk.findFirst({
        where: { nama: item.namaProduk },
      });

      if (!masterProduk) {
        console.log(
          `[UpdatePengajuanStokStatus] Creating MasterProduk: ${item.namaProduk}`,
        );

        let kategori = await this.prisma.kategoriToko.findFirst({
          where: { nama: { in: ["Sayur & Buah", "Sayuran"] } },
        });

        if (!kategori) kategori = await this.prisma.kategoriToko.findFirst();

        if (!kategori) {
          kategori = await this.prisma.kategoriToko.create({
            data: { nama: "Sayuran", icon: "🥬" },
          });
        }

        masterProduk = await this.prisma.masterProduk.create({
          data: {
            nama: item.namaProduk,
            slug: item.namaProduk
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[^a-z0-9-]/g, ""),
            deskripsi: `${item.namaProduk} berkualitas dari gudang`,
            kategoriId: kategori.id,
            satuan: item.satuan || "kg",
            allowCustomName: true,
            namaWajibMengandung: item.namaProduk.split(" ")[0],
            isActive: true,
          },
        });
        console.log(
          `[UpdatePengajuanStokStatus] MasterProduk auto-created: ${masterProduk.id}`,
        );
      }

      mapping = await this.prisma.mappingProdukGudang.create({
        data: {
          masterProdukId: masterProduk.id,
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
    } else if (item.ukuranKemasanKg && item.jumlahKemasan) {
      packagesToProcess.push({
        ukuranKg: Number(item.ukuranKemasanKg),
        jumlahKemasan: Number(item.jumlahKemasan),
      });
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
      where: { itemPengajuanStokId: item.id },
    });

    if (packagesToProcess.length > 0) {
      await this.prisma.itemPengajuanStokKemasan.createMany({
        data: packagesToProcess.map((pkg) => ({
          itemPengajuanStokId: item.id,
          ukuranKg: pkg.ukuranKg,
          jumlahKemasan: pkg.jumlahKemasan,
        })),
      });
    }

    const existingProduct = await this.prisma.produkEcom.findFirst({
      where: {
        tokoId: pengajuan.tokoId,
        masterProdukId: master.id,
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
        where: { id: existingProduct.id },
        data: {
          stok: newStok,
          hargaBeli: item.hargaGudang,
          harga: newHarga,
          status: "ACTIVE",
        },
      });

      console.log(
        `[UpdatePengajuanStokStatus] Updated existing product ${product.id} (Toko: ${pengajuan.tokoId}) with ${totalKgAdded}kg new stock. New total: ${newStok}kg.`,
      );

      await this.prisma.riwayatStokProduk.create({
        data: {
          produkId: product.id,
          penggunaId: effectivePenggunaId,
          tipe: "IN",
          kuantitas: Math.round(totalKgAdded),
          stokAkhir: newStok,
          catatan: `Stok masuk dari pengajuan ${pengajuan.id} - ${item.namaProduk} (${totalKgAdded} Kg)`,
        },
      });
    } else {
      const sellingPrice = item.hargaGudang * (1 + marginDefault / 100);

      product = await this.prisma.produkEcom.create({
        data: {
          tokoId: pengajuan.tokoId,
          kategoriId: master.kategoriId,
          masterProdukId: master.id,
          produkGudangId: item.produkGudangId,
          nama: master.nama,
          namaEtalase: null,
          deskripsi: master.deskripsi,
          satuan: master.satuan,
          beratGram: master.beratGram,
          stok: totalKgAdded,
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
        `[UpdatePengajuanStokStatus] Auto-created new standardized product ${product.id} with initial stock: ${totalKgAdded}kg.`,
      );

      await this.prisma.riwayatStokProduk.create({
        data: {
          produkId: product.id,
          penggunaId: effectivePenggunaId,
          tipe: "IN",
          kuantitas: Math.round(totalKgAdded),
          stokAkhir: Math.round(totalKgAdded),
          catatan: `Produk baru dari pengajuan ${pengajuan.id} - ${item.namaProduk} (${totalKgAdded} Kg)`,
        },
      });
    }

    for (const pkg of packagesToProcess) {
      await this.prisma.varianKemasan.upsert({
        where: {
          produkId_ukuranKg: {
            produkId: product.id,
            ukuranKg: pkg.ukuranKg,
          },
        },
        create: {
          produkId: product.id,
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

    await this.productsRepo.upsertInventory({
      where: {
        tokoId_produkId: {
          tokoId: pengajuan.tokoId,
          produkId: product.id,
        },
      },
      create: {
        tokoId: pengajuan.tokoId,
        produkId: product.id,
        stokTersediaKg: totalKgAdded,
        stokFisikKg: totalKgAdded,
      },
      update: {
        stokTersediaKg: { increment: totalKgAdded },
        stokFisikKg: { increment: totalKgAdded },
      },
    });
  }

  private async createFifoBatches(
    pengajuan: any,
    itemUpdates: any[] | undefined,
  ) {
    console.log(
      `[UpdatePengajuanStokStatus] Creating FIFO stock batches for pengajuan ${pengajuan.id}`,
    );

    const stokMasukItems: Array<{
      id: string;
      produkEcomId: string;
      jumlahDisetujui: number;
      hargaGudang: number;
      ukuranKemasanKg: number;
    }> = [];

    for (const item of pengajuan.items) {
      const updatePayload = itemUpdates?.find(
        (u) => u.itemId === item.id || u.produkGudangId === item.produkGudangId,
      );

      let produkEcomId = "";
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
        if (product) produkEcomId = product.id;
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
      } else if (item.ukuranKemasanKg && item.jumlahKemasan) {
        packages.push({
          ukuranKg: Number(item.ukuranKemasanKg),
          jumlahKemasan: Number(item.jumlahKemasan),
        });
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
            id: item.id,
            produkEcomId: produkEcomId,
            jumlahDisetujui: pkg.jumlahKemasan,
            hargaGudang: item.hargaGudang,
            ukuranKemasanKg: pkg.ukuranKg,
          });
        }
      }
    }

    if (stokMasukItems.length > 0) {
      try {
        await this.stokMasukService.processStockInFromPengajuan(
          pengajuan.id,
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
        const byId = pengajuan.items.find((it: any) => it.id === update.itemId);
        if (byId) targetItemId = byId.id;
      }

      if (targetItemId) {
        await this.stokRepo.updateItem({
          where: { id: targetItemId },
          data: {
            jumlahDisetujui: update.jumlahDisetujui,
          },
        });
      }
    }
  }
}
