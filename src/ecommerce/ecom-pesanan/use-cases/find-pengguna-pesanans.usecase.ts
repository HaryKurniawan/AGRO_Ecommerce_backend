import { Injectable } from "@nestjs/common";

import { PesananEcomsRepository } from "../repositories/ecom-pesanans.repository";

@Injectable()
export class FindUserOrdersUseCase {
  constructor(private readonly ordersRepo: PesananEcomsRepository) {}

  async execute(penggunaId: string, status?: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where: any = { konsumenId: penggunaId };
    if (status) where.status = status.toUpperCase();

    const [data, total] = await Promise.all([
      this.ordersRepo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          item: {
            include: {
              produk: {
                include: {
                  toko: { select: { id: true, nama: true, fotoUrl: true } },
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
