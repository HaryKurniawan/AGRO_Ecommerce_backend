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


@Injectable()
export class GetTotalUnreadMessagesUseCase {
  constructor(
    private readonly chatRepo: ChatRepository,
  ) {}

  async execute(penggunaId: string) {


    const count = await this.chatRepo.countMessages({
      where: {
        sudahDibaca: false,
        pengirimId: { not: penggunaId },
        percakapan: {
          OR: [{ partisipanA: penggunaId }, { partisipanB: penggunaId }],
        },
      },
    });



    return { totalUnread: count };
  }
}
