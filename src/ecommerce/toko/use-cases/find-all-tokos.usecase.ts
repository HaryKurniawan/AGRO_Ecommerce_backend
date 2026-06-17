import { Injectable } from "@nestjs/common";
import { TokosRepository } from "../repositories/tokos.repository";
import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class FindAllStoresUseCase {
  constructor(
    private readonly storesRepo: TokosRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(query: {
    wilayah?: string;
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;
    else where.status = "ACTIVE";

    if (query.wilayah) where.wilayah = query.wilayah;
    if (query.search) {
      where.OR = [
        { nama: { contains: query.search, mode: "insensitive" } },
        { kabupaten: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [rawStores, total, activeMerchants, aggregateRating] =
      await Promise.all([
        this.prisma.toko.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            penjual: { select: { namaToko: true, penggunaId: true } },
            produk: {
              select: {
                id: true,
                ulasan: {
                  where: { isHidden: false },
                  select: { rating: true },
                },
                itemPesanan: {
                  select: { jumlah: true },
                },
              },
            },
          },
        }),
        this.storesRepo.count({ where }),
        this.storesRepo.count({ where: { ...where, status: "ACTIVE" } }),
        this.prisma.ulasanProdukEcom.aggregate({
          where: { isHidden: false },
          _avg: { rating: true },
        }),
      ]);

    const data = rawStores.map((toko: any) => {
      const { produk, ...rest } = toko;
      
      const totalProduk = produk.length;
      
      const allReviews = produk.flatMap((p: any) => p.ulasan);
      const rating = allReviews.length > 0
        ? allReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / allReviews.length
        : 0;

      const totalPenjualan = produk.reduce(
        (sum: number, p: any) => sum + p.itemPesanan.reduce((s: number, i: any) => s + i.jumlah, 0),
        0
      );

      return {
        ...rest,
        totalProduk,
        rating,
        totalPenjualan,
      };
    });

    const extraStats = {
      totalStores: total,
      activeMerchants,
      avgRating: aggregateRating?._avg?.rating || 0,
    };

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      extraStats,
    };
  }
}
