import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { GetCartUseCase } from "./get-keranjang.usecase";
@Injectable()
export class UpdateCartItemUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly getCartUC: GetCartUseCase,
  ) {}

  async execute(
    penggunaId: string,
    itemId: string,
    jumlah: number,
    varianKemasanId?: string,
  ) {
    const item = await this.prisma.itemKeranjangEcom.findUnique({
      where: { id: itemId },
      include: { keranjang: true },
    });
    
    if (!item || item.keranjang.konsumenId !== penggunaId) {
      throw new NotFoundException("Cart item not found");
    }

    if (jumlah <= 0) {
      await this.prisma.itemKeranjangEcom.delete({ where: { id: itemId } });
      return { success: true, message: "Item removed from cart" };
    }

    // Verify stock
    const produkId = item.produkId;
    const produk = await this.prisma.produkEcom.findUnique({ where: { id: produkId } });
    if (!produk || produk.stok < jumlah) {
      throw new BadRequestException("Produk tidak ditemukan atau stok tidak mencukupi");
    }

    if (varianKemasanId !== undefined) {
      const newVarianId = varianKemasanId === "" ? null : varianKemasanId;
      
      await this.prisma.itemKeranjangEcom.update({
        where: { id: itemId },
        data: {
          jumlah,
          varianKemasanId: newVarianId,
        },
      });
      return { success: true, message: "Item updated in cart" };
    }

    // Just update quantity
    await this.prisma.itemKeranjangEcom.update({
      where: { id: itemId },
      data: { jumlah },
    });

    return { success: true, message: "Item updated in cart" };
  }
}
