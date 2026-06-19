/**
 * Use Case: Get Total Unread Messages
 *
 * Fungsi ini bertugas sebagai endpoint "Polling" yang cepat dan ringan.
 *
 * Kegunaan Bisnis:
 * - Dipanggil terus-menerus secara interval dari front-end UI atau dipanggil di Background App
 *   untuk memeriksa cuplikan Badge Angka Merah dari aplikasi pengguna tanpa memuat seluruh pesan.
 */

import { Injectable } from "@nestjs/common";

import { ChatRepository } from "../repositories/chat.repository";
import { RedisService } from "../../../infrastructure/redis/redis.service";

@Injectable()
export class GetTotalUnreadMessagesUseCase {
  constructor(
    private readonly chatRepo: ChatRepository,
    private readonly redisService: RedisService,
  ) {}

  async execute(penggunaId: string) {
    const cacheKey = `chat:unread:${penggunaId}`;
    const cached = await this.redisService.getClient().get(cacheKey);

    if (cached !== null) {
      return { totalUnread: parseInt(cached, 10) };
    }

    const count = await this.chatRepo.countMessages({
      where: {
        sudahDibaca: false,
        pengirimId: { not: penggunaId },
        percakapan: {
          OR: [{ partisipanA: penggunaId }, { partisipanB: penggunaId }],
        },
      },
    });

    // Cache for 30 seconds
    await this.redisService.getClient().set(cacheKey, count.toString(), "EX", 30);

    return { totalUnread: count };
  }
}
