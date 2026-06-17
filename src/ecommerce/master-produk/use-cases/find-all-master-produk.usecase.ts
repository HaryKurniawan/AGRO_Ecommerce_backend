import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { MasterProdukRepository } from "../repositories/master-produk.repository";

@Injectable()
export class FindAllMasterProdukUseCase {
  constructor(private readonly masterRepo: MasterProdukRepository) {}

  async execute(filters: {
    search?: string;
    kategoriId?: string;
    isActive?: boolean | string;
    page?: number;
    limit?: number;
  }) {
    const { search, kategoriId, isActive, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.MasterProdukWhereInput = {};

    if (search) {
      where.nama = {
        contains: search,
        mode: "insensitive",
      };
    }

    if (kategoriId) {
      where.kategoriId = kategoriId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === true || isActive === "true";
    }

    const [data, total] = await Promise.all([
      this.masterRepo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          kategori: true,
          mappingGudang: true,
        },
      }),
      this.masterRepo.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
