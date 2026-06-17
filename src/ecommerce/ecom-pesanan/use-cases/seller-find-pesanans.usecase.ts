import { Injectable } from "@nestjs/common";

import { PesananEcomsRepository } from "../repositories/ecom-pesanans.repository";

@Injectable()
export class SellerFindOrdersUseCase {
  constructor(private readonly ordersRepo: PesananEcomsRepository) {}

  async execute(
    tokoId: string,
    status?: string,
    page = 1,
    limit = 10,
    isGrosir?: boolean,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      item: { some: { produk: { tokoId } } },
    };
    if (status) where.status = status.toUpperCase();
    if (isGrosir !== undefined) where.isGrosir = isGrosir;

    const [data, total] = await Promise.all([
      this.ordersRepo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          konsumen: { select: { nama: true, email: true } },
          item: {
            where: { produk: { tokoId } },
            include: { produk: true },
          },
          pengiriman: true,
        },
      }),
      this.ordersRepo.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
