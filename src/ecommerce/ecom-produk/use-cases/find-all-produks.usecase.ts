import { Injectable } from "@nestjs/common";

import { ProdukEcomsRepository } from "../repositories/ecom-produks.repository";
import { RedisService } from "../../../infrastructure/redis/redis.service";
import * as crypto from "crypto";

@Injectable()
export class FindAllProductsUseCase {
  constructor(
    private readonly productsRepo: ProdukEcomsRepository,
    private readonly redisService: RedisService,
  ) {}

  async execute(query: {
    kategoriId?: string;
    tokoId?: string;
    search?: string;
    kota?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
  }) {
    // Generate cache key based on query params
    const queryHash = crypto.createHash("md5").update(JSON.stringify(query)).digest("hex");
    const cacheKey = `products:list:${queryHash}`;

    const cached = await this.redisService.getClient().get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { status: "ACTIVE" };
    if (query.kategoriId) where.kategoriId = query.kategoriId;
    if (query.tokoId) where.tokoId = query.tokoId;
    if (query.search) {
      where.OR = [
        { nama: { contains: query.search, mode: "insensitive" } },
        { deskripsi: { contains: query.search, mode: "insensitive" } },
      ];
    }

    // Filter lokasi: produk dari toko yang berada/melayani kota tertentu.
    // Selaras dengan validasi area pengiriman (kabupaten + areaCakupanKota).
    if (query.kota && query.kota.trim()) {
      const kota = query.kota.trim();
      where.toko = {
        OR: [
          { kabupaten: { equals: kota, mode: "insensitive" } },
          { areaCakupanKota: { has: kota } },
        ],
      };
    }

    let orderBy: any = { createdAt: "desc" };
    if (query.sortBy === "price_asc") orderBy = { harga: "asc" };
    if (query.sortBy === "price_desc") orderBy = { harga: "desc" };
    if (query.sortBy === "popular") orderBy = { itemPesanan: { _count: "desc" } };
    if (query.sortBy === "rating") orderBy = { ulasan: { _count: "desc" } };

    const [data, total] = await Promise.all([
      this.productsRepo.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          toko: { select: { id: true, nama: true, kabupaten: true } },
          kategori: { select: { id: true, nama: true, icon: true } },
          masterProduk: { select: { id: true, nama: true } },
          varian: {
            where: { isActive: true },
            orderBy: { ukuranKg: "asc" },
          },
          ulasan: {
            where: { isHidden: false },
            select: { rating: true },
          },
          itemPesanan: {
            select: { jumlah: true },
          },
        },
      }),
      this.productsRepo.count({ where }),
    ]);

    const mappedData = data.map((p: any) => {
      const totalReviews = p.ulasan.length;
      const avgRating = totalReviews > 0
        ? p.ulasan.reduce((acc: number, curr: any) => acc + curr.rating, 0) / totalReviews
        : 0;

      const terjual = p.itemPesanan.reduce((acc: number, curr: any) => acc + curr.jumlah, 0);

      const { ulasan, itemPesanan, ...rest } = p;
      return {
        ...rest,
        rating: avgRating,
        terjual,
      };
    });

    const result = {
      data: mappedData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    // Cache for 5 minutes
    await this.redisService.getClient().set(cacheKey, JSON.stringify(result), "EX", 300);

    return result;
  }
}
