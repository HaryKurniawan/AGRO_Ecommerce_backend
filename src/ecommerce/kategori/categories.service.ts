import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../infrastructure/database/prisma.service";

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.kategoriToko.findMany({
      orderBy: { nama: "asc" },
    });
  }

  async findOne(id: string) {
    const kategori = await this.prisma.kategoriToko.findUnique({
      where: { id },
    });
    if (!kategori) throw new NotFoundException("Category not found");
    return kategori;
  }

  async create(data: { nama: string; icon?: string }) {
    return this.prisma.kategoriToko.create({ data });
  }

  async update(id: string, data: { nama?: string; icon?: string }) {
    await this.findOne(id);
    return this.prisma.kategoriToko.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.kategoriToko.delete({ where: { id } });
  }
}
