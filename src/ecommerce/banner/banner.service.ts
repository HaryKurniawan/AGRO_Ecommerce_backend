import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";

@Injectable()
export class BannerService {

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findAllPublic() {
    const banners = await this.prisma.bannerPromo.findMany({
      where: { isAktif: true },
      orderBy: { urutan: "asc" },
    });

    return banners;
  }

  async findAllAdmin() {
    return this.prisma.bannerPromo.findMany({
      orderBy: { urutan: "asc" },
    });
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
    

    return { success: true };
  }
}
