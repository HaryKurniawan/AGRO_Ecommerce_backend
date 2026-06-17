import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class GetProductReviewsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    produkId: string,
    page = 1,
    limit = 10,
    rating?: number,
    sortBy?: string,
    includeHidden = false,
  ) {
    const skip = (page - 1) * limit;

    const queryWhere: Prisma.UlasanProdukEcomWhereInput = {
      produkId,
      ...(includeHidden ? {} : { isHidden: false }),
    };
    if (rating) queryWhere.rating = rating;

    let queryOrderBy:
      | Prisma.UlasanProdukEcomOrderByWithRelationInput
      | Prisma.UlasanProdukEcomOrderByWithRelationInput[] = {
      createdAt: "desc",
    };
    if (sortBy === "highest")
      queryOrderBy = [{ rating: "desc" }, { createdAt: "desc" }];

    const [ulasan, total] = await Promise.all([
      this.prisma.ulasanProdukEcom.findMany({
        where: queryWhere,
        include: { pengguna: { select: { id: true, nama: true } } },
        orderBy: queryOrderBy,
        skip,
        take: limit,
      }),
      this.prisma.ulasanProdukEcom.count({ where: queryWhere }),
    ]);

    return {
      data: ulasan,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
