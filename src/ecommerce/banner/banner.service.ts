import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { RedisService } from "../../infrastructure/redis/redis.service";

@Injectable()
export class BannerService {
  private readonly CACHE_KEY = "banners:public";

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  async findAllPublic() {
    const cached = await this.redis.getClient().get(this.CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }

    const banners = await this.prisma.bannerPromo.findMany({
      where: { isAktif: true },
      orderBy: { urutan: "asc" },
    });

    // Cache for 1 hour (3600 seconds)
    await this.redis.getClient().setex(this.CACHE_KEY, 3600, JSON.stringify(banners));

    return banners;
  }

  async findAllAdmin() {
    return this.prisma.bannerPromo.findMany({
      orderBy: { urutan: "asc" },
    });
  }

  private async invalidateCache() {
    await this.redis.getClient().del(this.CACHE_KEY);
  }

  async create(data: any) {
    // Cari urutan terakhir
    const lastBanner = await this.prisma.bannerPromo.findFirst({
      orderBy: { urutan: "desc" },
    });
    const nextUrutan = lastBanner ? lastBanner.urutan + 1 : 0;

    const banner = await this.prisma.bannerPromo.create({
      data: {
        ...data,
        urutan: nextUrutan,
      },
    });

    await this.invalidateCache();
    return banner;
  }

  async update(id: string, data: any) {
    const banner = await this.prisma.bannerPromo.findUnique({
      where: { id },
    });
    if (!banner) throw new NotFoundException("Banner tidak ditemukan");

    const updated = await this.prisma.bannerPromo.update({
      where: { id },
      data,
    });

    await this.invalidateCache();
    return updated;
  }

  async delete(id: string) {
    const banner = await this.prisma.bannerPromo.findUnique({
      where: { id },
    });
    if (!banner) throw new NotFoundException("Banner tidak ditemukan");

    const deleted = await this.prisma.bannerPromo.delete({
      where: { id },
    });

    await this.invalidateCache();
    return deleted;
  }

  async reorder(orderedIds: string[]) {
    const transaction = orderedIds.map((id, index) =>
      this.prisma.bannerPromo.update({
        where: { id },
        data: { urutan: index },
      })
    );
    await this.prisma.$transaction(transaction);
    
    await this.invalidateCache();
    return { success: true };
  }
}
