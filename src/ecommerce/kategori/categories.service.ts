import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../infrastructure/database/prisma.service";
import { RedisService } from "../../infrastructure/redis/redis.service";

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async findAll() {
    const cached = await this.redisService.getClient().get("categories:all");
    if (cached) {
      return JSON.parse(cached);
    }

    const categories = await this.prisma.kategoriToko.findMany({
      orderBy: { nama: "asc" },
    });

    await this.redisService.getClient().set("categories:all", JSON.stringify(categories), "EX", 1800); // 30 mins
    return categories;
  }

  async findOne(id: string) {
    const kategori = await this.prisma.kategoriToko.findUnique({
      where: { id },
    });
    if (!kategori) throw new NotFoundException("Category not found");
    return kategori;
  }

  async create(data: { nama: string; icon?: string }) {
    const result = await this.prisma.kategoriToko.create({ data });
    await this.redisService.getClient().del("categories:all");
    return result;
  }

  async update(id: string, data: { nama?: string; icon?: string }) {
    await this.findOne(id);
    const result = await this.prisma.kategoriToko.update({ where: { id }, data });
    await this.redisService.getClient().del("categories:all");
    return result;
  }

  async remove(id: string) {
    await this.findOne(id);
    const result = await this.prisma.kategoriToko.delete({ where: { id } });
    await this.redisService.getClient().del("categories:all");
    return result;
  }
}
