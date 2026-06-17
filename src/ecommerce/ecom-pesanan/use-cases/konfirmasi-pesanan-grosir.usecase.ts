import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";

import { PesananEcomsRepository } from "../repositories/ecom-pesanans.repository";
import { TokosRepository } from "../../toko/repositories/tokos.repository";
import { ProdukEcomsRepository } from "../../ecom-produk/repositories/ecom-produks.repository";
import { PengajuanStokRepository } from "../../pengajuan-stok/repositories/pengajuan-stok.repository";

@Injectable()
export class KonfirmasiPesananGrosirUseCase {
  private readonly logger = new Logger(KonfirmasiPesananGrosirUseCase.name);

  constructor(
    private readonly ordersRepo: PesananEcomsRepository,
    private readonly tokosRepo: TokosRepository,
    private readonly productsRepo: ProdukEcomsRepository,
    private readonly pengajuanStokRepo: PengajuanStokRepository,
  ) {}

  async execute(
    penggunaId: string, // Seller ID
    pesananId: string,
    data: {
      terima: boolean;
      ongkirBaru?: number;
      catatanSeller?: string;
    },
  ) {
    const pesanan = await this.ordersRepo.findUnique({
      where: { id: pesananId },
      include: { item: { include: { produk: true } } },
    });

    if (!pesanan) {
      throw new NotFoundException("Pesanan tidak ditemukan");
    }

    if (pesanan.status !== "MENUNGGU_KONFIRMASI_SELLER") {
      throw new BadRequestException(
        "Status pesanan bukan menunggu konfirmasi seller",
      );
    }

    const produkId = pesanan.item[0]?.produkId;
    if (!produkId) {
      throw new BadRequestException("Pesanan tidak memiliki item");
    }

    // DITOLAK → batalkan pesanan
    if (!data.terima) {
      return this.ordersRepo.update({
        where: { id: pesananId },
        data: {
          status: "DIBATALKAN",
          catatan: data.catatanSeller
            ? `${pesanan.catatan || ""}\nCatatan Seller: ${data.catatanSeller}`
            : pesanan.catatan,
        },
      });
    }

    // DITERIMA → cari toko dan gudang terafiliasi
    const productData = await this.productsRepo.findUnique({
      where: { id: produkId },
      select: { tokoId: true },
    });

    const tokoId = productData?.tokoId;
    if (!tokoId) {
      throw new BadRequestException("Toko tidak ditemukan untuk produk ini");
    }

    const toko = await this.tokosRepo.findUnique({ where: { id: tokoId } });
    if (!toko) {
      throw new BadRequestException("Toko tidak ditemukan");
    }

    // Hitung ulang total
    const ongkir =
      data.ongkirBaru !== undefined ? data.ongkirBaru : pesanan.ongkir;
    const subtotal = pesanan.item.reduce(
      (sum, it) => sum + it.harga * it.jumlah,
      0,
    );
    const totalHarga = subtotal + ongkir;

    // Update pesanan → MENUNGGU_BAYAR (customer dapat invoice)
    const updated = await this.ordersRepo.update({
      where: { id: pesananId },
      data: {
        status: "MENUNGGU_BAYAR",
        diprosesOleh: "TOKO",
        ongkir,
        totalHarga,
        catatan: data.catatanSeller
          ? `${pesanan.catatan || ""}\nCatatan Seller: ${data.catatanSeller}`
          : pesanan.catatan,
      },
    });

    return updated;
  }
}
