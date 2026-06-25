import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

import { PrismaService } from "../../infrastructure/database/prisma.service";
import { RedisService } from "../../infrastructure/redis/redis.service";
import { BroadcastNotifDto } from "./dto/broadcast-notif.dto";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    @InjectQueue("notifikasi") private readonly notifQueue: Queue,
  ) {}

  async findByUser(
    penggunaId: string,
    page: number | string = 1,
    limit: number | string = 20,
  ) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.max(1, Number(limit) || 20);
    const skip = (p - 1) * l;
    
    const redisClient = this.redisService.getClient();
    const cacheKey = `notif:unread:${penggunaId}`;
    let unreadCount = 0;
    const cachedUnread = await redisClient.get(cacheKey);

    if (cachedUnread) {
      unreadCount = parseInt(cachedUnread, 10);
    } else {
      unreadCount = await this.prisma.notifikasi.count({ where: { penggunaId, isRead: false } });
      await redisClient.setex(cacheKey, 300, unreadCount); // 5 mins cache
    }

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
    await this.redisService.getClient().del(`notif:unread:${penggunaId}`);
    return res;
  }

  async markAllAsRead(penggunaId: string) {
    const res = await this.prisma.notifikasi.updateMany({
      where: { penggunaId, isRead: false },
      data: { isRead: true },
    });
    await this.redisService.getClient().del(`notif:unread:${penggunaId}`);
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
    await this.redisService.getClient().del(`notif:unread:${penggunaId}`);
    return this.notifQueue.add("createNotif", {
      penggunaId,
      ...payload,
      payloadData: payload.data,
    });
  }

  async createBroadcast(dto: BroadcastNotifDto) {
    return this.notifQueue.add("broadcastNotif", {
      ...dto,
      payloadData: dto.data,
    });
  }
}
