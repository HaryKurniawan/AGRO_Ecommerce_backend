import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { GetCartUseCase } from "./get-keranjang.usecase";
import { RedisService } from "../../../infrastructure/redis/redis.service";

@Injectable()
export class UpdateCartItemUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly getCartUC: GetCartUseCase,
    private readonly redisService: RedisService,
  ) {}

  async execute(
    penggunaId: string,
    itemId: string,
    jumlah: number,
    varianKemasanId?: string,
  ) {
    const cartKey = `cart:${penggunaId}`;
    
    // Validate if item exists in redis hash
    const currentJumlahStr = await this.redisService.getClient().hget(cartKey, itemId);
    if (!currentJumlahStr) throw new NotFoundException("Cart item not found");

    if (jumlah <= 0) {
      await this.redisService.getClient().hdel(cartKey, itemId);
      return { success: true, message: "Item removed from cart" };
    }

    // Verify stock
    const [produkId] = itemId.split('_');
    const produk = await this.prisma.produkEcom.findUnique({ where: { id: produkId } });
    if (!produk || produk.stok < jumlah) {
      throw new BadRequestException("Produk tidak ditemukan atau stok tidak mencukupi");
    }

    if (varianKemasanId !== undefined) {
      const newVarianId = varianKemasanId === "" ? "null" : varianKemasanId;
      const newKey = `${produkId}_${newVarianId}`;
      
      if (newKey !== itemId) {
        // Remove old key, add new key
        await this.redisService.getClient().hdel(cartKey, itemId);
        await this.redisService.getClient().hset(cartKey, newKey, jumlah);
        return { success: true, message: "Item updated in cart" };
      }
    }

    // Just update quantity
    await this.redisService.getClient().hset(cartKey, itemId, jumlah);
    await this.redisService.getClient().expire(cartKey, 604800); // Reset TTL

    return { success: true, message: "Item updated in cart" };
  }
}
