import { Injectable } from "@nestjs/common";

import { PenggunasRepository } from "../repositories/pengguna.repository";

@Injectable()
export class FindAllUsersUseCase {
  constructor(private readonly usersRepo: PenggunasRepository) {}

  async execute(query: {
    peran?: string;
    page?: number | string;
    limit?: number | string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 20);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.peran) {
      if (query.peran.includes(",")) {
        where.peran = { in: query.peran.split(",") };
      } else {
        where.peran = query.peran;
      }
    }

    const [data, total] = await Promise.all([
      this.usersRepo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          nama: true,
          peran: true,
          noTelepon: true,
          aktif: true,

          profilPenjual: {
            select: {
              namaToko: true,
              status: true,
            },
          },
          profilPenjualKurir: {
            select: {
              namaToko: true,
            },
          },
          emailTerverifikasiPada: true,
          createdAt: true,
        },
      }),
      this.usersRepo.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
