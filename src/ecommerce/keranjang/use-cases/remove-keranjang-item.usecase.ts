import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { GetCartUseCase } from "./get-keranjang.usecase";
import { RedisService } from "../../../infrastructure/redis/redis.service";

@Injectable()
export class RemoveCartItemUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly getCartUC: GetCartUseCase,
    private readonly redisService: RedisService,
  ) {}

  async execute(penggunaId: string, itemId: string) {
    const cartKey = `cart:${penggunaId}`;
    
    // Validate if item exists in redis hash
    const currentJumlahStr = await this.redisService.getClient().hget(cartKey, itemId);
    if (!currentJumlahStr) throw new NotFoundException("Cart item not found");

    await this.redisService.getClient().hdel(cartKey, itemId);
    
    return { success: true, message: "Item removed from cart" };
  }
}
