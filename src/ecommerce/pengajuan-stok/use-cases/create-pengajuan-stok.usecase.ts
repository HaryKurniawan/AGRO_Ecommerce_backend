import { Injectable, BadRequestException } from "@nestjs/common";

import { PengajuanStokRepository } from "../repositories/pengajuan-stok.repository";
import { TokosRepository } from "../../toko/repositories/tokos.repository";
import { WebhookQueueService } from "../queue/webhook-queue.service";

@Injectable()
export class CreatePengajuanStokUseCase {
  constructor(
    private readonly stokRepo: PengajuanStokRepository,
    private readonly tokosRepo: TokosRepository,
    private readonly webhookQueue: WebhookQueueService,
  ) {}

  async execute(
    penggunaId: string,
    data: {
      gudangId: string;
      catatan?: string;
      modePengemasan?: "DEFAULT" | "CUSTOM";
      items: {
        produkGudangId: string;
        jumlahPermintaan: number;
        ukuranKemasanKg?: number;
        jumlahKemasan?: number;
        totalKg?: number;
        kemasanDetail?: { ukuranKg: number; jumlahKemasan: number }[];
      }[];
    },
  ) {
    // Verify user is a seller and has a store
    const profil = await this.tokosRepo.findSellerProfileByUserId(penggunaId);
    if (!profil) {
      throw new BadRequestException("Pengguna bukan penjual");
    }

    const toko = await this.tokosRepo.findUnique({
      where: { penjualId: profil.id },
    });

    if (!toko) {
      throw new BadRequestException("Toko tidak ditemukan");
    }

    if (!data.items || data.items.length === 0) {
      throw new BadRequestException("Item pengajuan tidak boleh kosong");
    }

    // ✅ OPEN MARKETPLACE: No affiliation check required
    // Any seller can create stock request to any warehouse
    console.log(
      `[CreatePengajuanStok] Open marketplace mode - no affiliation check for toko ${toko.id} to gudang ${data.gudangId}`,
    );

    // ✅ Fetch product details from GUDANG backend for snapshot
    const gudangApiUrl = process.env.GUDANG_API_URL || "http://localhost:5005";
    const productDetailsPromises = data.items.map(async (item) => {
      try {
        const response = await fetch(
          `${gudangApiUrl}/api/produk/affiliate?gudangId=${data.gudangId}&tokoId=${toko.id}`,
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch product ${item.produkGudangId}`);
        }

        const result = await response.json();
        const products = result.data.products || [];
        const produk = products.find((p: any) => p.id === item.produkGudangId);

        if (!produk) {
          throw new Error(
            `Product ${item.produkGudangId} not found in warehouse`,
          );
        }

        return {
          produkGudangId: item.produkGudangId,
          namaProduk: produk.nama,
          varianProduk: produk.varianProduk || null,
          satuan: produk.satuan,
          hargaGudang: produk.hargaGudang,
          jumlahPermintaan: item.jumlahPermintaan,
          ukuranKemasanKg:
            item.ukuranKemasanKg !== undefined
              ? Number(item.ukuranKemasanKg)
              : null,
          jumlahKemasan:
            item.jumlahKemasan !== undefined
              ? Number(item.jumlahKemasan)
              : null,
          totalKg:
            item.totalKg !== undefined ? Number(item.totalKg) : null,
          kemasanDetail: item.kemasanDetail ?? null,
        };
      } catch (error) {
        console.error(`Error fetching product ${item.produkGudangId}:`, error);
        throw new BadRequestException(
          `Gagal mengambil detail produk ${item.produkGudangId} dari gudang`,
        );
      }
    });

    const productDetails = await Promise.all(productDetailsPromises);

    // ✅ Create pengajuan with snapshot data
    const mode = data.modePengemasan || "DEFAULT";
    const pengajuan = await this.stokRepo.create({
      data: {
        tokoId: toko.id,
        gudangId: data.gudangId,
        catatan: data.catatan,
        status: "DIAJUKAN",
        modePengemasan: mode as any,
        items: {
          create: productDetails.map((item) => ({
            produkGudangId: item.produkGudangId,
            namaProduk: item.namaProduk,
            varianProduk: item.varianProduk,
            satuan: item.satuan,
            hargaGudang: item.hargaGudang,
            jumlahPermintaan: item.jumlahPermintaan,
            ukuranKemasanKg: item.ukuranKemasanKg,
            jumlahKemasan: item.jumlahKemasan,
            // Simpan detail kemasan (1kg / 2.5kg) ke DB ecommerce
            ...(item.kemasanDetail && item.kemasanDetail.length > 0
              ? {
                  kemasanDetail: {
                    create: item.kemasanDetail.map((k) => ({
                      ukuranKg: Number(k.ukuranKg),
                      jumlahKemasan: Number(k.jumlahKemasan),
                    })),
                  },
                }
              : {}),
          })),
        },
      },
      include: {
        items: true,
        toko: true,
      },
    });

    // ✅ Asynchronously send pengajuan stok data to GUDANG backend webhook via in-memory queue
    const webhookUrl = `${gudangApiUrl}/api/pengajuan/webhook/from-ecommerce`;

    await this.webhookQueue.add(
      "from-ecommerce",
      {
        url: webhookUrl,
        payload: {
          ecommerceRequestId: pengajuan.id,
          tokoId: toko.id,
          tokoNama: toko.nama,
          gudangId: data.gudangId,
          catatan: data.catatan,
          modePengemasan: mode,
          items: productDetails.map((item) => ({
            ...item,
            // kemasanDetail sudah ada di dalam productDetails, pastikan dikirim
            kemasanDetail: item.kemasanDetail ?? undefined,
          })),
        },
      },
      { attempts: 5, backoff: { delay: 2000 } },
    );

    console.log(
      `[Webhook] ✅ Queued pengajuan stok ${pengajuan.id} to be sent to GUDANG backend`,
    );

    return pengajuan;
  }
}
