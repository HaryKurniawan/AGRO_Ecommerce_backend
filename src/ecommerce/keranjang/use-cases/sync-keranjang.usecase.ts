import { Injectable, BadRequestException } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { GetCartUseCase } from "./get-keranjang.usecase";
import { RedisService } from "../../../infrastructure/redis/redis.service";

@Injectable()
export class SyncCartUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly getCartUC: GetCartUseCase,
    private readonly redisService: RedisService,
  ) {}

  async execute(
    penggunaId: string,
    items: { produkId: string; jumlah: number; varianKemasanId?: string }[],
  ) {
    if (!items || items.length === 0) return this.getCartUC.execute(penggunaId);

    // 1. Ambil alamat utama user
    const defaultAddress = await this.prisma.alamatKonsumen.findFirst({
      where: { konsumenId: penggunaId, isDefault: true },
    });

    const userCity = defaultAddress?.kota?.toLowerCase();

    // 2. Jika user memiliki alamat utama, lakukan validasi kota produk
    if (userCity) {
      const productIds = items.map((i) => i.produkId);
      const products = await this.prisma.produkEcom.findMany({
        where: { id: { in: productIds } },
        include: { toko: true },
      });

      for (const product of products) {
        const productCity = product.toko.kabupaten?.toLowerCase();
        if (productCity && productCity !== userCity) {
          throw new BadRequestException(
            `Keranjang berisi produk dari kota ${product.toko.kabupaten}, sedangkan alamat utama Anda di ${defaultAddress.kota}. Silakan kosongkan keranjang terlebih dahulu.`
          );
        }
      }
    }

    const cartKey = `cart:${penggunaId}`;
    const pipeline = this.redisService.getClient().pipeline();

    for (const item of items) {
      const varianId = item.varianKemasanId || 'null';
      const key = `${item.produkId}_${varianId}`;
      pipeline.hincrby(cartKey, key, item.jumlah);
    }
    
    pipeline.expire(cartKey, 604800); // 7 days
    await pipeline.exec();

    return this.getCartUC.execute(penggunaId);
  }
}
