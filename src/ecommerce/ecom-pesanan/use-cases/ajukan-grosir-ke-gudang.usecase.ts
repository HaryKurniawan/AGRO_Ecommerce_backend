import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";

import { PesananEcomsRepository } from "../repositories/ecom-pesanans.repository";
import { TokosRepository } from "../../toko/repositories/tokos.repository";
import { PengajuanStokRepository } from "../../pengajuan-stok/repositories/pengajuan-stok.repository";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { WebhookQueueService } from "../../pengajuan-stok/queue/webhook-queue.service";

@Injectable()
export class AjukanGrosirKeGudangUseCase {
  private readonly logger = new Logger(AjukanGrosirKeGudangUseCase.name);

  constructor(
    private readonly ordersRepo: PesananEcomsRepository,
    private readonly tokosRepo: TokosRepository,
    private readonly pengajuanStokRepo: PengajuanStokRepository,
    private readonly prisma: PrismaService,
    private readonly webhookQueue: WebhookQueueService,
  ) {}

  async execute(
    penggunaId: string,
    pesananId: string,
    payload: { gudangId: string },
  ) {
    const pesanan = await this.ordersRepo.findUnique({
      where: { id: pesananId },
      include: { item: { include: { produk: true } } },
    });

    if (!pesanan) {
      throw new NotFoundException("Pesanan tidak ditemukan");
    }

    if (!pesanan.isGrosir) {
      throw new BadRequestException("Pesanan ini bukan pesanan grosir");
    }

    if (pesanan.status !== "DIPROSES") {
      throw new BadRequestException(
        "Pesanan hanya bisa diajukan ke gudang jika statusnya DIPROSES (sudah dibayar)",
      );
    }

    const produkId = pesanan.item[0]?.produkId;
    if (!produkId) {
      throw new BadRequestException("Pesanan tidak memiliki item");
    }

    // Find the store
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

    const gudangId = payload.gudangId;
    if (!gudangId) {
      throw new BadRequestException("Gudang tujuan harus dipilih.");
    }

    // Verify double submission by checking if a PengajuanStok already has the note containing this order ID
    const catatanGrosirPattern = `Pesanan ID: ${pesananId}`;
    const existingRequest = await this.pengajuanStokRepo.findFirst({
      where: {
        tokoId: toko.id,
        gudangId,
        catatan: {
          contains: catatanGrosirPattern,
        },
      } as any,
    });

    if (existingRequest) {
      throw new BadRequestException(
        "Pesanan ini sudah pernah diajukan ke Gudang.",
      );
    }

    const catatanGrosir =
      `[PESANAN GROSIR] Pesanan ID: ${pesananId} — ` +
      (pesanan.item as any[])
        .map((it: any) => `${it.produk?.nama || it.produkId} x${it.jumlah} kg`)
        .join(", ") +
      `. Harap diproses dalam 3 hari kerja.`;

    // ⚠️ IMPORTANT: Pesanan grosir uses ProdukEcom, but PengajuanStok needs ProdukGudang
    // For now, we'll use a workaround: fetch product details from GUDANG backend
    // TODO: Add proper mapping table between ProdukEcom and ProdukGudang

    const gudangApiUrl = process.env.GUDANG_API_URL || "http://localhost:5005";

    // Fetch warehouse products to map ProdukEcom to ProdukGudang
    let productDetailsPromises;
    try {
      const response = await fetch(
        `${gudangApiUrl}/api/produk/affiliate?gudangId=${gudangId}&tokoId=${toko.id}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch warehouse products");
      }

      const result = await response.json();
      const warehouseProducts = result.data.products || [];

      // Query active mappings for this gudang
      const mappings = await this.prisma.mappingProdukGudang.findMany({
        where: { gudangId },
      });

      // Map each order item to warehouse product
      productDetailsPromises = (pesanan.item as any[]).map(async (it: any) => {
        const produkEcom = it.produk;
        let produkGudangId = null;
        let warehouseProduct = null;

        // 1. Primary approach: Match by MappingProdukGudang via masterProdukId
        if (produkEcom?.masterProdukId) {
          const mapping = mappings.find(
            (m) => m.masterProdukId === produkEcom.masterProdukId,
          );
          if (mapping) {
            produkGudangId = mapping.produkGudangId;
            warehouseProduct = warehouseProducts.find(
              (wp: any) => wp.id === produkGudangId,
            );
          }
        }

        // 2. Secondary fallback approach: match by name
        if (!warehouseProduct) {
          warehouseProduct = warehouseProducts.find(
            (wp: any) =>
              wp.nama.toLowerCase() === produkEcom?.nama?.toLowerCase(),
          );
          if (warehouseProduct) {
            produkGudangId = warehouseProduct.id;
          }
        }

        // 3. Desperate fallback
        if (!warehouseProduct) {
          this.logger.warn(
            `No matching warehouse product found for ${produkEcom?.nama}. Using first available product.`,
          );
          warehouseProduct = warehouseProducts[0];
          if (!warehouseProduct) {
            throw new Error("No warehouse products available");
          }
          produkGudangId = warehouseProduct.id;
        }

        return {
          produkGudangId: produkGudangId,
          namaProduk: produkEcom?.nama || warehouseProduct.nama,
          satuan: warehouseProduct.satuan,
          hargaGudang: warehouseProduct.hargaGudang,
          jumlahPermintaan: it.jumlah,
        };
      });
    } catch (error) {
      this.logger.error("Failed to fetch warehouse products:", error);
      throw new BadRequestException(
        "Gagal mengambil data produk gudang. Pastikan gudang backend berjalan dan toko Anda terafiliasi dengan gudang.",
      );
    }

    const productDetails = await Promise.all(productDetailsPromises);

    // Fetch customer coordinates for direct warehouse delivery
    const userAddress = await this.prisma.alamatKonsumen.findFirst({
      where: {
        konsumenId: pesanan.konsumenId,
        alamat: pesanan.alamatKirim,
      },
    });

    const isPesananGrosir = true;
    const alamatKirim = pesanan.alamatKirim;
    const lat = userAddress?.lat;
    const lng = userAddress?.lng;
    const konsumenId = pesanan.konsumenId;

    // 1. First, create the local stock request with warehouse product IDs
    const newRequest = await this.pengajuanStokRepo.create({
      data: {
        tokoId: toko.id,
        gudangId,
        catatan: catatanGrosir,
        isPesananGrosir,
        alamatKirim,
        lat,
        lng,
        konsumenId,
        items: {
          create: productDetails.map((item) => ({
            produkGudangId: item.produkGudangId,
            namaProduk: item.namaProduk,
            satuan: item.satuan,
            hargaGudang: item.hargaGudang,
            jumlahPermintaan: item.jumlahPermintaan,
          })),
        },
      },
    });

    // 2. Sync to independent Gudang Express DB via in-memory queue
    const triggerUrl = process.env.GUDANG_API_URL
      ? `${process.env.GUDANG_API_URL}/api/events/trigger-new-request`
      : "http://localhost:5005/api/events/trigger-new-request";

    await this.webhookQueue.add(
      "trigger-new-request",
      {
        url: triggerUrl,
        payload: {
          gudangId,
          pengajuanId: newRequest.id,
          tokoId: toko.id,
          tokoNama: toko.nama,
          catatan: catatanGrosir,
          isPesananGrosir,
          alamatKirim,
          lat,
          lng,
          konsumenId,
          items: productDetails,
          message: `Ada pengajuan stok baru [GROSIR] dari toko ${toko.nama}`,
        },
      },
      { attempts: 5, backoff: { delay: 2000 } },
    );

    this.logger.log(
      `Queued webhook to sync PengajuanStok to gudang ${gudangId} for wholesale order ${pesananId}`,
    );

    return newRequest;
  }
}
