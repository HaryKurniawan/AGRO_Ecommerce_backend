import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../infrastructure/database/prisma.service";

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findAll() {
    const categories = await this.prisma.kategoriToko.findMany({
      orderBy: { nama: "asc" },
    });

    return categories.map((c: any) => ({ ...c, id: c.id_kategoriToko }));
  }

  async findOne(id: string) {
    const kategori = await this.prisma.kategoriToko.findUnique({
      where: { id_kategoriToko: id },
    });
    if (!kategori) throw new NotFoundException("Category not found");
    (kategori as any).id = kategori.id_kategoriToko;
    return kategori;
  }

  async create(data: { nama: string; icon?: string }) {
    const result = await this.prisma.kategoriToko.create({ data });

    return result;
  }

  async update(id: string, data: { nama?: string; icon?: string }) {
    await this.findOne(id);
    const result = await this.prisma.kategoriToko.update({ where: { id_kategoriToko: id }, data });

    return result;
  }

  async remove(id: string) {
    await this.findOne(id);
    const result = await this.prisma.kategoriToko.delete({ where: { id_kategoriToko: id } });

    return result;
  }
}
