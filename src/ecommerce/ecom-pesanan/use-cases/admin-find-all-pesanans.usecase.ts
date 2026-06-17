import { Injectable } from "@nestjs/common";

import { PesananEcomsRepository } from "../repositories/ecom-pesanans.repository";

@Injectable()
export class AdminFindAllOrdersUseCase {
  constructor(private readonly ordersRepo: PesananEcomsRepository) {}

  async execute(query: { status?: string; page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.ordersRepo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          konsumen: { select: { nama: true, email: true } },
          item: {
            include: {
              produk: {
                select: {
                  nama: true,
                  gambarUrl: true,
                  toko: { select: { nama: true, id: true } },
                },
              },
            },
          },
          pengiriman: true,
        },
      }),
      this.ordersRepo.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
