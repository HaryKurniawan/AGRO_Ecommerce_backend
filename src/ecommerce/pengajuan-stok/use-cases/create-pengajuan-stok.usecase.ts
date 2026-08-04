import { Injectable, BadRequestException } from "@nestjs/common";

import { PengajuanStokRepository } from "../repositories/pengajuan-stok.repository";
import { TokosRepository } from "../../toko/repositories/tokos.repository";
import { WebhookQueueService } from "../queue/webhook-queue.service";
import { IdGenerator } from "../../utils/id-generator.util";

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
      tipePengiriman?: "DEFAULT" | "CUSTOM";
      tanggalPermintaanKirim?: string | Date;
      items: {
        produkGudangId: string;
        jumlahPermintaan: number;

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
      where: { penjualId: profil.id_profilPenjual },
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
      `[CreatePengajuanStok] Open marketplace mode - no affiliation check for toko ${toko.id_toko} to gudang ${data.gudangId}`,
    );

    // ✅ Fetch product details from GUDANG backend for snapshot
    const gudangApiUrl = process.env.GUDANG_API_URL || "http://localhost:5005";
    const productDetailsPromises = data.items.map(async (item) => {
      try {
        const response = await fetch(
          `${gudangApiUrl}/api/produk/affiliate?gudangId=${data.gudangId}&tokoId=${toko.id_toko}`,
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

    // ✅ Validate Tipe Pengiriman & Tanggal
    const tipePengiriman = data.tipePengiriman || "DEFAULT";
    let tanggalPermintaanKirim: Date | null = null;
    let estimasiSampai: Date | null = null;
    
    if (tipePengiriman === "CUSTOM") {
      if (!data.tanggalPermintaanKirim) {
        throw new BadRequestException("Tanggal permintaan kirim harus diisi untuk tipe pengiriman CUSTOM");
      }
      tanggalPermintaanKirim = new Date(data.tanggalPermintaanKirim);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const hPlus2 = new Date(today);
      hPlus2.setDate(hPlus2.getDate() + 2);
      
      if (tanggalPermintaanKirim < hPlus2) {
        throw new BadRequestException("Tanggal permintaan kirim minimal H+2 dari hari ini");
      }
      estimasiSampai = tanggalPermintaanKirim;
    } else {
      // Default: 1-2 hari (we set it to H+2 for estimation)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const hPlus2 = new Date(today);
      hPlus2.setDate(hPlus2.getDate() + 2);
      estimasiSampai = hPlus2;
    }

    // ✅ Create pengajuan with snapshot data
    const mode = data.modePengemasan || "DEFAULT";
    const totalPengajuan = await this.stokRepo.count({});
    const nomorPengajuan = IdGenerator.generateStockRequestNumber(toko.kodeToko || "TKO", totalPengajuan + 1);

    const pengajuan = await this.stokRepo.create({
      data: {
        nomorPengajuan,
        tokoId: toko.id_toko,
        gudangId: data.gudangId,
        catatan: data.catatan,
        status: "DIAJUKAN",
        modePengemasan: mode as any,
        tipePengiriman: tipePengiriman as any,
        tanggalPermintaanKirim: tanggalPermintaanKirim,
        estimasiSampai: estimasiSampai,
        items: {
          create: productDetails.map((item) => ({
            produkGudangId: item.produkGudangId,
            namaProduk: item.namaProduk,
            varianProduk: item.varianProduk,
            satuan: item.satuan,
            hargaGudang: item.hargaGudang,
            jumlahPermintaan: item.jumlahPermintaan,

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
          ecommerceRequestId: pengajuan.id_pengajuanStok,
          nomorPengajuan: pengajuan.nomorPengajuan,
          tokoId: toko.id_toko,
          tokoNama: toko.nama,
          gudangId: data.gudangId,
          catatan: data.catatan,
          modePengemasan: mode,
          tipePengiriman: tipePengiriman,
          tanggalPermintaanKirim: tanggalPermintaanKirim?.toISOString(),
          estimasiSampai: estimasiSampai?.toISOString(),
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
      `[Webhook] ✅ Queued pengajuan stok ${pengajuan.id_pengajuanStok} to be sent to GUDANG backend`,
    );

    return pengajuan;
  }
}
