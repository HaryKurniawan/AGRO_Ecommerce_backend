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
    const keranjang: any = await this.getCartUC.execute(penggunaId);
    const item = keranjang.item.find((i: any) => i.id === itemId);
    if (!item) throw new NotFoundException("Cart item not found");

    return this.prisma.itemKeranjangEcom.delete({ where: { id: itemId } });
  }
}
