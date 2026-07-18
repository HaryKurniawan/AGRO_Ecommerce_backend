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

    const pengguna = await this.prisma.pengguna.findUnique({
      where: { id: penggunaId },
      select: { noTeleponTerverifikasiPada: true, peran: true }
    });

    const isAdmin = ["SUPER_ADMIN", "ADMIN_CS"].includes(pengguna?.peran || "");
    if (!isAdmin && !pengguna) {
      throw new BadRequestException("Data pengguna tidak ditemukan.");
    }

    let totalJumlah = 0;
    for (const it of item) {
      if (!it.jumlah || it.jumlah <= 0) {
        throw new BadRequestException("Jumlah pesanan tidak valid");
      }
      totalJumlah += it.jumlah;
    }

    if (totalJumlah < 300) {
      throw new BadRequestException(
        "Total keseluruhan pesanan grosir harus minimal 300 kg",
      );
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

    // Fetch config toko untuk ongkosKirimGrosir
    const tokoConfig = await this.prisma.konfigurasiHargaToko.findUnique({
      where: { tokoId: produk.tokoId },
    });
    const ongkosKirimGrosir = tokoConfig?.ongkosKirimGrosir || 0;

    const subtotal = item.reduce(
      (sum: number, it: any) => sum + it.harga * it.jumlah,
      0,
    );

    // Hitung diskon
    const diskonPersen = data.diskonGrosirPersen || 0;
    const nominalDiskon = (subtotal * diskonPersen) / 100;
    const totalHarga = subtotal - nominalDiskon + ongkosKirimGrosir;

    // Create the order with status MENUNGGU_KONFIRMASI_SELLER
    console.log("PACKAGING SPECS RECEIVED:", JSON.stringify(data.packagingSpecs));
    const pesanan = await this.ordersRepo.create({
      data: {
        konsumenId: penggunaId,
        tokoId: produk.tokoId,
        status: "MENUNGGU_KONFIRMASI_SELLER",
        isGrosir: true,
        ongkir: ongkosKirimGrosir,
        totalHarga,
        metodeBayar: data.metodeBayar || "MANUAL",
        alamatKirim: data.alamatKirim || "Default Address",
        catatan,
        kemasanGrosir: data.packagingSpecs || [],
        diskonGrosirPersen: diskonPersen,
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
