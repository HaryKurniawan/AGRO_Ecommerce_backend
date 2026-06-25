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
import { XenditService } from "../services/xendit.service";
import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class KonfirmasiPesananGrosirUseCase {
  private readonly logger = new Logger(KonfirmasiPesananGrosirUseCase.name);

  constructor(
    private readonly ordersRepo: PesananEcomsRepository,
    private readonly tokosRepo: TokosRepository,
    private readonly productsRepo: ProdukEcomsRepository,
    private readonly pengajuanStokRepo: PengajuanStokRepository,
    private readonly xenditService: XenditService,
    private readonly prisma: PrismaService,
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

    let paymentId = undefined;
    let paymentUrl = undefined;

    const isOnlinePayment = !["COD", "MANUAL", "CASH"].includes(
      pesanan.metodeBayar?.toUpperCase() || "",
    );

    if (isOnlinePayment) {
      try {
        const konsumen = await this.prisma.pengguna.findUnique({
          where: { id: pesanan.konsumenId },
          select: { nama: true, email: true, noTelepon: true },
        });

        const itemDetails = pesanan.item.map((item) => ({
          id: item.produkId,
          price: item.harga,
          quantity: item.jumlah,
          name: item.produk?.nama?.substring(0, 50) || "Produk",
        }));

        if (ongkir > 0) {
          itemDetails.push({
            id: `ONGKIR-${pesanan.id}`,
            price: ongkir,
            quantity: 1,
            name: "Ongkos Kirim",
          });
        }

        if (pesanan.metodeBayar?.toUpperCase() === "QRIS") {
          const qrisTx = await this.xenditService.createQRIS({
            referenceId: pesanan.id,
            amount: totalHarga,
          });
          paymentId = qrisTx.id;
          paymentUrl = qrisTx.qrString;
        } else {
          const invoiceTx = await this.xenditService.createInvoice({
            externalId: pesanan.id,
            amount: totalHarga,
            payerEmail: konsumen?.email,
            customerName: konsumen?.nama,
            customerPhone: konsumen?.noTelepon,
            items: itemDetails.map((i) => ({
              name: i.name,
              price: i.price,
              quantity: i.quantity,
            })),
          });
          paymentId = invoiceTx.id;
          paymentUrl = invoiceTx.invoiceUrl;
        }
      } catch (xenditError: any) {
        this.logger.error(
          "Gagal membuat transaksi Xendit",
          xenditError?.message,
        );
      }
    }

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
        paymentId,
        paymentUrl,
      },
    });

    return updated;
  }
}
