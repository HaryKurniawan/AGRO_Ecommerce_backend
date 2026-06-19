import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { RedisService } from "../../../infrastructure/redis/redis.service";

@Injectable()
export class GetCartUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async execute(penggunaId: string) {
    const pengguna = await this.prisma.pengguna.findUnique({
      where: { id: penggunaId },
    });
    if (!pengguna) {
      throw new NotFoundException("Pengguna not found. Cannot access keranjang.");
    }

    const items = await this.redisService.getClient().hgetall(`cart:${penggunaId}`);
    
    const cartItems = [];
    const productIds: string[] = [];
    const varianIds: string[] = [];

    // Parse keys like "produkId_varianId" or "produkId_null"
    for (const key of Object.keys(items)) {
      const [produkId, varianId] = key.split('_');
      if (!productIds.includes(produkId)) productIds.push(produkId);
      if (varianId !== 'null' && !varianIds.includes(varianId)) varianIds.push(varianId);
    }

    if (productIds.length > 0) {
      // Fetch all products in cart
      const products = await this.prisma.produkEcom.findMany({
        where: { id: { in: productIds } },
        include: {
          toko: { select: { id: true, nama: true } },
          varian: { where: { isActive: true } },
        }
      });
      
      // Fetch all varians in cart
      const varians = varianIds.length > 0 ? await this.prisma.varianKemasan.findMany({
        where: { id: { in: varianIds } }
      }) : [];

      // Map back to cartItems structure
      for (const [key, jumlahStr] of Object.entries(items)) {
        const [produkId, varianId] = key.split('_');
        const produk = products.find(p => p.id === produkId);
        const varianKemasan = varianId !== 'null' ? varians.find(v => v.id === varianId) : null;
        
        if (produk) {
          cartItems.push({
            id: key, // Use the generated key as itemId for frontend operations
            keranjangId: `cart:${penggunaId}`,
            produkId,
            varianKemasanId: varianId !== 'null' ? varianId : null,
            jumlah: parseInt(jumlahStr, 10),
            produk,
            varianKemasan,
            createdAt: new Date(), // Dummy date since Redis hash doesn't preserve order easily
          });
        }
      }
    }

    return {
      id: `cart:${penggunaId}`,
      konsumenId: penggunaId,
      item: cartItems,
    };
  }
}
