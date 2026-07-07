import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class ClearCartUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(penggunaId: string) {
    await this.prisma.itemKeranjangEcom.deleteMany({
      where: { keranjang: { konsumenId: penggunaId } },
    });
    return { success: true, message: "Cart cleared" };
  }
}
