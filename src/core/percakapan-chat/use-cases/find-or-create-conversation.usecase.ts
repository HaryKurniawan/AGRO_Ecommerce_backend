/**
 * Use Case: Find or Create Conversation
 *
 * Fungsi ini bertugas sebagai gerbang awal untuk setiap interaksi Chat antara 2 buah entitas (participant).
 *
 * Kegunaan Bisnis:
 * - Dipanggil ketika pengguna (Customer) menekan tombol "Chat Penjual" di halaman Produk atau dari Keranjang.
 * - Mencari apakah histori percakapan antar dua entitas ini (dengan tipe spesifik) sudah pernah terjadi sebelumnya.
 * - Jika sudah ada, kembalikan instance objek kamar obrolannya. Jika belum, buka instance kamar yang sama sekali baru.
 */

import { Injectable } from "@nestjs/common";
import { TipeChat } from "@prisma/client";

import { ChatRepository } from "../repositories/chat.repository";

@Injectable()
export class FindOrCreateConversationUseCase {
  constructor(private readonly chatRepo: ChatRepository) {}

  async execute(
    tipe: TipeChat,
    partisipanA: string,
    partisipanB: string,
    tokoId?: string,
  ) {
    // Standardisasi agar pencarian unik aman dari letak partisipan yang tertukar urutannya.
    const sortedParticipants = [partisipanA, partisipanB].sort();
    const pA = sortedParticipants[0];
    const pB = sortedParticipants[1];

    let conversation = await this.chatRepo.findConversationUnique({
      where: {
        tipe_partisipanA_partisipanB: {
          tipe,
          partisipanA: pA,
          partisipanB: pB,
        },
      },
    });

    if (!conversation) {
      conversation = await this.chatRepo.createConversation({
        tipe,
        partisipanA: pA,
        partisipanB: pB,
        tokoId,
      });
    } else if (!conversation.tokoId && tokoId) {
      // Jika ternyata conversation sebelumnya memiliki data _null_ tokoId, namun yang request kali ini punya
      // Lakukan pembersihan metadata tokoId untuk _context switching_ yang lebih baik.
      conversation = await this.chatRepo.updateConversation(conversation.id, {
        tokoId,
      });
    }

    return conversation;
  }
}
