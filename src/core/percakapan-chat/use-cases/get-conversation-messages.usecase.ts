/**
 * Use Case: Get Conversation Messages Payload
 *
 * Fungsi ini bertugas memuat seluruh history log dari satu kamar obrolan percakapan / room yang spesifik.
 *
 * Kegunaan Bisnis:
 * - Menggelar (render) pesan ketika pengguna membuka suatu percakapan.
 * - Mengembalikan List of `PesanChat` dalam paging limit secara Descending dan Ascending agar front-end
 *   mudah menyesuaikan scroll bar.
 * - Memastikan bahwa Pengguna Pengirim (Requester) benar-benar memiliki otoritas membaca kamar tersebut.
 */

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";

import { ChatRepository } from "../repositories/chat.repository";

@Injectable()
export class GetConversationMessagesUseCase {
  constructor(private readonly chatRepo: ChatRepository) {}

  async execute(percakapanId: string, penggunaId: string, isAdmin = false) {
    const conversation = await this.chatRepo.findConversationUnique({
      where: { id: percakapanId },
      include: {
        pesan: {
          orderBy: { createdAt: "desc" }, // Ambil yang terbaru dulu untuk limit
          take: 50,
        },
      },
    });

    if (conversation && (conversation as any).pesan) {
      // Balikkan urutan agar tetap natural (lama ke baru) di frontend
      (conversation as any).pesan.reverse();
    }

    if (!conversation) {
      throw new NotFoundException("Percakapan tidak ditemukan");
    }

    // Otorisasi: Blokir akses bila bukan parstisipan terkait maupun bukan super_admin!
    if (
      !isAdmin &&
      conversation.partisipanA !== penggunaId &&
      conversation.partisipanB !== penggunaId
    ) {
      throw new ForbiddenException(
        "Anda tidak memiliki akses ke percakapan ini",
      );
    }

    // Identify other participant — include seller profile for store name
    const otherUserId =
      conversation.partisipanA === penggunaId
        ? conversation.partisipanB
        : conversation.partisipanA;
    const otherUser = (await this.chatRepo.findUserById(otherUserId, {
      id: true,
      nama: true,
      email: true,
      peran: true,
      noTelepon: true,
      profilPenjual: {
        select: { namaToko: true },
      },
    })) as any;

    // For PENJUAL users, prefer the store name over personal name
    const otherUserDisplayName =
      otherUser?.peran === "PENJUAL"
        ? otherUser.profilPenjual?.namaToko || otherUser.nama
        : otherUser?.nama;

    return {
      ...conversation,
      otherUser: otherUser
        ? {
            id: otherUser.id,
            name: otherUserDisplayName,
            email: otherUser.email,
            role: otherUser.peran,
            phone: otherUser.noTelepon,
          }
        : null,
    };
  }
}
