import { Injectable, BadRequestException } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { GetCartUseCase } from "./get-keranjang.usecase";

@Injectable()
export class AddCartItemUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly getCartUC: GetCartUseCase,
  ) {}

  async execute(
    penggunaId: string,
    produkId: string,
    jumlah: number,
    varianKemasanId?: string,
  ) {
    // Verify product exists and has stock
    const produk = await this.prisma.produkEcom.findUnique({
      where: { id: produkId },
    });
    if (!produk || produk.stok < jumlah) {
      throw new BadRequestException("Produk tidak ditemukan atau stok tidak mencukupi");
    }

    const keranjang = await this.getCartUC.execute(penggunaId);

    const existingItem = keranjang.item.find(
      (i) => i.produkId === produkId && i.varianKemasanId === (varianKemasanId || null)
    );

    if (existingItem) {
      await this.prisma.itemKeranjangEcom.update({
        where: { id: existingItem.id },
        data: { jumlah: existingItem.jumlah + jumlah },
      });
    } else {
      await this.prisma.itemKeranjangEcom.create({
        data: {
          keranjangId: keranjang.id,
          produkId,
          varianKemasanId: varianKemasanId || null,
          jumlah,
        },
      });
    }

    return { success: true, message: "Item added to cart" };
  }
}
