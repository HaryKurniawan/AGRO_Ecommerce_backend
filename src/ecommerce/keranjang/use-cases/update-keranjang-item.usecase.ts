import { Injectable, NotFoundException } from "@nestjs/common";

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
    const keranjang: any = await this.getCartUC.execute(penggunaId);
    const item = keranjang.item.find((i: any) => i.id === itemId);
    if (!item) throw new NotFoundException("Cart item not found");

    if (jumlah <= 0) {
      return this.prisma.itemKeranjangEcom.delete({ where: { id: itemId } });
    }

    const updateData: any = { jumlah };
    if (varianKemasanId !== undefined) {
      updateData.varianKemasanId =
        varianKemasanId === "" ? null : varianKemasanId;
    }

    return this.prisma.itemKeranjangEcom.update({
      where: { id: itemId },
      data: updateData,
    });
  }
}
