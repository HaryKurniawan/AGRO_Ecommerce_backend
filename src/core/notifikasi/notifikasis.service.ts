import { Injectable, Logger } from "@nestjs/common";
import { Prisma, TipeNotifikasi, Peran } from "@prisma/client";

import { PrismaService } from "../../infrastructure/database/prisma.service";
import { NotifSseService } from "./notifikasis.sse.service";
import { BroadcastNotifDto } from "./dto/broadcast-notif.dto";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sseService: NotifSseService,
  ) {}

  async findByUser(
    penggunaId: string,
    page: number | string = 1,
    limit: number | string = 20,
  ) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.max(1, Number(limit) || 20);
    const skip = (p - 1) * l;
    
    const unreadCount = await this.prisma.notifikasi.count({ where: { penggunaId, isRead: false } });

    const [data, total] = await Promise.all([
      this.prisma.notifikasi.findMany({
        where: { penggunaId },
        skip,
        take: l,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.notifikasi.count({ where: { penggunaId } }),
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
    const res = await this.prisma.notifikasi.updateMany({
      where: { id, penggunaId },
      data: { isRead: true },
    });
    return res;
  }

  async markAllAsRead(penggunaId: string) {
    const res = await this.prisma.notifikasi.updateMany({
      where: { penggunaId, isRead: false },
      data: { isRead: true },
    });
    return res;
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
    const notif = await this.prisma.notifikasi.create({
      data: {
        penggunaId,
        judul: payload.judul,
        pesan: payload.pesan,
        tipe: payload.tipe as TipeNotifikasi,
        data: payload.data ? (payload.data as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    this.sseService.emitToUser(penggunaId, {
      id: notif.id,
      penggunaId: notif.penggunaId,
      judul: notif.judul,
      pesan: notif.pesan,
      tipe: notif.tipe,
      isRead: notif.isRead,
      createdAt: notif.createdAt,
    });

    return notif;
  }

  async createBroadcast(dto: BroadcastNotifDto) {
    const { judul, pesan, target, data: payloadData } = dto;
    let targetUsers: { id: string }[] = [];

    // Parse target
    if (target === 'ALL_USER') {
      targetUsers = await this.prisma.pengguna.findMany({
        where: { peran: 'KONSUMEN' },
        select: { id: true },
      });
    } else if (target === 'ALL_OPERASIONAL') {
      targetUsers = await this.prisma.pengguna.findMany({
        where: {
          peran: {
            in: ['PENJUAL', 'KURIR', 'ADMIN_CS', 'SUPER_ADMIN'],
          },
        },
        select: { id: true },
      });
    } else if (target.startsWith('ROLE:')) {
      const role = target.replace('ROLE:', '') as Peran;
      targetUsers = await this.prisma.pengguna.findMany({
        where: { peran: role },
        select: { id: true },
      });
    } else if (target.startsWith('USER:')) {
      const userId = target.replace('USER:', '');
      targetUsers = [{ id: userId }];
    }

    if (targetUsers.length === 0) {
      return { sent: 0 };
    }

    const batchedData = targetUsers.map((u) => ({
      penggunaId: u.id,
      judul,
      pesan,
      tipe: TipeNotifikasi.BROADCAST,
      data: payloadData ? (payloadData as Prisma.InputJsonValue) : Prisma.JsonNull,
    }));

    await this.prisma.notifikasi.createMany({
      data: batchedData,
    });

    const ssePayload = {
      judul,
      pesan,
      tipe: TipeNotifikasi.BROADCAST,
      isRead: false,
      createdAt: new Date(),
    };

    const userIds = targetUsers.map((u) => u.id);
    this.sseService.emitToUsers(userIds, ssePayload);

    return { sent: userIds.length };
  }
}
