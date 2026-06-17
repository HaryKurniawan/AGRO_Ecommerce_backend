import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";

import { PesananEcomsRepository } from "../repositories/ecom-pesanans.repository";
import { ProdukEcomsRepository } from "../../ecom-produk/repositories/ecom-produks.repository";
import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class CreatePesananGrosirUseCase {
  constructor(
    private readonly ordersRepo: PesananEcomsRepository,
    private readonly productsRepo: ProdukEcomsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(penggunaId: string, data: any) {
    const { item, catatan, ongkir, alamatKirim } = data;

    if (!item || item.length === 0) {
      throw new BadRequestException(
        "Pesanan harus memiliki setidaknya satu item",
      );
    }

    for (const it of item) {
      if (!it.jumlah || it.jumlah < 300) {
        throw new BadRequestException(
          "Jumlah pesanan grosir harus minimal 300",
        );
      }
    }

    // Grosir assumes 1 store per order for simplicity in this implementation
    const produkId = item[0].produkId;
    const produk = await this.productsRepo.findUnique({
      where: { id: produkId },
    });

    if (!produk) {
      throw new NotFoundException(
        `Produk dengan ID ${produkId} tidak ditemukan`,
      );
    }

    // Location guard: Check if user address is within service area
    if (alamatKirim) {
      const userAddress = await this.prisma.alamatKonsumen.findFirst({
        where: {
          konsumenId: penggunaId,
          alamat: alamatKirim,
        },
      });

      if (userAddress && (!userAddress.lat || !userAddress.lng)) {
        throw new ForbiddenException(
          "Alamat pengiriman tidak memiliki koordinat lokasi. Silakan perbarui alamat Anda.",
        );
      }

      // Check if address is within allowed service area (e.g., Jawa Barat)
      const allowedProvinces = ["Jawa Barat", "Jawa Tengah", "Jawa Timur"];
      if (
        userAddress &&
        userAddress.provinsi &&
        !allowedProvinces.includes(userAddress.provinsi)
      ) {
        throw new ForbiddenException(
          "Pengajuan grosir hanya tersedia untuk area tertentu. Silakan hubungi penjual untuk informasi lebih lanjut.",
        );
      }
    }

    const subtotal = item.reduce(
      (sum: number, it: any) => sum + it.harga * it.jumlah,
      0,
    );
    const totalHarga = subtotal + (ongkir || 0);

    // Create the order with status MENUNGGU_KONFIRMASI_SELLER
    const pesanan = await this.ordersRepo.create({
      data: {
        konsumenId: penggunaId,
        tokoId: produk.tokoId,
        status: "MENUNGGU_KONFIRMASI_SELLER",
        isGrosir: true,
        ongkir: ongkir || 0,
        totalHarga,
        metodeBayar: data.metodeBayar || "MANUAL",
        alamatKirim: data.alamatKirim || "Default Address",
        catatan,
        diprosesOleh: "TOKO",
        item: {
          create: item.map((it: any) => ({
            produkId: it.produkId,
            jumlah: it.jumlah,
            harga: it.harga,
          })),
        },
      },
    });

    return pesanan;
  }
}
