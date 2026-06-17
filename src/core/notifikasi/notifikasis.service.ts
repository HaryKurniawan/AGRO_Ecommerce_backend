import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../infrastructure/database/prisma.service";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUser(
    penggunaId: string,
    page: number | string = 1,
    limit: number | string = 20,
  ) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.max(1, Number(limit) || 20);
    const skip = (p - 1) * l;
    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notifikasi.findMany({
        where: { penggunaId },
        skip,
        take: l,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.notifikasi.count({ where: { penggunaId } }),
      this.prisma.notifikasi.count({ where: { penggunaId, isRead: false } }),
    ]);
    return {
      data,
      total,
      unreadCount,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
    };
  }

  async markAsRead(id: string, penggunaId: string) {
    return this.prisma.notifikasi.updateMany({
      where: { id, penggunaId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(penggunaId: string) {
    return this.prisma.notifikasi.updateMany({
      where: { penggunaId, isRead: false },
      data: { isRead: true },
    });
  }

  async create(
    penggunaId: string,
    payload: {
      judul: string;
      pesan: string;
      tipe: string;
      data?: Record<string, unknown>;
    },
  ) {
    return this.prisma.notifikasi.create({
      data: {
        penggunaId,
        judul: payload.judul,
        pesan: payload.pesan,
        tipe: payload.tipe,
        data: payload.data
          ? (payload.data as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
  }
}
