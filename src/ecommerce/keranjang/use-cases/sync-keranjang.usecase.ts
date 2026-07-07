import { Injectable, BadRequestException } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { GetCartUseCase } from "./get-keranjang.usecase";

@Injectable()
export class SyncCartUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly getCartUC: GetCartUseCase,
  ) {}

  async execute(
    penggunaId: string,
    items: { produkId: string; jumlah: number; varianKemasanId?: string }[],
  ) {
    if (!items || items.length === 0) return this.getCartUC.execute(penggunaId);

    // 1. Ambil alamat utama user
    const defaultAddress = await this.prisma.alamatKonsumen.findFirst({
      where: { konsumenId: penggunaId, isDefault: true },
    });

    const userCity = defaultAddress?.kota?.toLowerCase();

    // 2. Jika user memiliki alamat utama, lakukan validasi kota produk
    if (userCity) {
      const productIds = items.map((i) => i.produkId);
      const products = await this.prisma.produkEcom.findMany({
        where: { id: { in: productIds } },
        include: { toko: true },
      });

      for (const product of products) {
        const productCity = product.toko.kabupaten?.toLowerCase();
        if (productCity && productCity !== userCity) {
          throw new BadRequestException(
            `Keranjang berisi produk dari kota ${product.toko.kabupaten}, sedangkan alamat utama Anda di ${defaultAddress.kota}. Silakan kosongkan keranjang terlebih dahulu.`
          );
        }
      }
    }

    const keranjang = await this.getCartUC.execute(penggunaId);

    // Prepare operations
    const operations = [];

    for (const item of items) {
      const varianId = item.varianKemasanId || null;
      const existingItem = keranjang.item.find(
        (i) => i.produkId === item.produkId && i.varianKemasanId === varianId
      );

      if (existingItem) {
        operations.push(
          this.prisma.itemKeranjangEcom.update({
            where: { id: existingItem.id },
            data: { jumlah: existingItem.jumlah + item.jumlah },
          })
        );
      } else {
        operations.push(
          this.prisma.itemKeranjangEcom.create({
            data: {
              keranjangId: keranjang.id,
              produkId: item.produkId,
              varianKemasanId: varianId,
              jumlah: item.jumlah,
            },
          })
        );
      }
    }

    await this.prisma.$transaction(operations);

    return this.getCartUC.execute(penggunaId);
  }
}
