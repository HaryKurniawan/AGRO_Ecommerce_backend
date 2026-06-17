import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class FindAllActivityLogsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(params: {
    page?: number;
    limit?: number;
    kategori?: string;
    search?: string;
  }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.kategori && params.kategori !== "SEMUA") {
      where.kategori = params.kategori;
    }

    if (params.search) {
      where.OR = [
        { deskripsi: { contains: params.search, mode: "insensitive" } },
        { aksi: { contains: params.search, mode: "insensitive" } },
        {
          pengguna: {
            nama: { contains: params.search, mode: "insensitive" },
          },
        },
        {
          pengguna: {
            email: { contains: params.search, mode: "insensitive" },
          },
        },
      ];
    }

    const [logs, total] = await Promise.all([
      this.prisma.logAktivitas.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          pengguna: {
            select: {
              id: true,
              nama: true,
              email: true,
              peran: true,
              profilPenjual: {
                select: {
                  namaToko: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.logAktivitas.count({ where }),
    ]);

    return {
      statusCode: 200,
      data: {
        logs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }
}
