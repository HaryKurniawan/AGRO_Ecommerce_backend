import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { RedisService } from "../../../infrastructure/redis/redis.service";

@Injectable()
export class ClearCartUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async execute(penggunaId: string) {
    const cartKey = `cart:${penggunaId}`;
    await this.redisService.getClient().del(cartKey);
    return { success: true, message: "Cart cleared" };
  }
}
