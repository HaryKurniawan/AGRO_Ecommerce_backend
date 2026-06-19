import { Injectable, BadRequestException } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { GetCartUseCase } from "./get-keranjang.usecase";
import { RedisService } from "../../../infrastructure/redis/redis.service";

@Injectable()
export class AddCartItemUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly getCartUC: GetCartUseCase,
    private readonly redisService: RedisService,
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

    const key = `${produkId}_${varianKemasanId || 'null'}`;
    const cartKey = `cart:${penggunaId}`;
    
    // Add to Redis Hash
    await this.redisService.getClient().hincrby(cartKey, key, jumlah);
    
    // Reset TTL to 7 days
    await this.redisService.getClient().expire(cartKey, 604800);

    return { success: true, message: "Item added to cart" };
  }
}
