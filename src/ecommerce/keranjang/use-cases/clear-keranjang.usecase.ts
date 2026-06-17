import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class ClearCartUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(penggunaId: string) {
    const keranjang = await this.prisma.keranjangEcom.findUnique({
      where: { konsumenId: penggunaId },
    });
    if (!keranjang) return { count: 0 };

    return this.prisma.itemKeranjangEcom.deleteMany({
      where: { keranjangId: keranjang.id },
    });
  }
}
