import { Injectable } from "@nestjs/common";

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
    const keranjang: any = await this.getCartUC.execute(penggunaId);

    // Find cart item with matching product and packaging variant
    const existing = keranjang.item.find(
      (item: any) =>
        item.produkId === produkId &&
        item.varianKemasanId === (varianKemasanId || null),
    );

    if (existing) {
      return this.prisma.itemKeranjangEcom.update({
        where: { id: existing.id },
        data: { jumlah: existing.jumlah + jumlah },
        include: {
          produk: true,
          varianKemasan: true,
        },
      });
    }

    return this.prisma.itemKeranjangEcom.create({
      data: {
        keranjangId: keranjang.id,
        produkId,
        jumlah,
        varianKemasanId: varianKemasanId || null,
      },
      include: {
        produk: true,
        varianKemasan: true,
      },
    });
  }
}
