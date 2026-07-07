import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { GetCartUseCase } from "./get-keranjang.usecase";

@Injectable()
export class RemoveCartItemUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly getCartUC: GetCartUseCase,
  ) {}

  async execute(penggunaId: string, itemId: string) {
    const item = await this.prisma.itemKeranjangEcom.findUnique({
      where: { id: itemId },
      include: { keranjang: true },
    });
    
    if (!item || item.keranjang.konsumenId !== penggunaId) {
      throw new NotFoundException("Cart item not found");
    }

    await this.prisma.itemKeranjangEcom.delete({ where: { id: itemId } });
    
    return { success: true, message: "Item removed from cart" };
  }
}
