/**
 * Use Case: Send Chat Message (Kirim Pesan)
 *
 * Fungsi inti untuk menyimpan pesan obrolan antara pengguna.
 *
 * Kegunaan Bisnis:
 * - Mengabadiikan Record teks ke tabel PesanChat tunggal.
 * - Serta OTOMATIS memperbarui data cuplikan `pesanTerakhir` & `waktuPesanTerakhir` di tabel Parent (PercakapanChat),
 *   sehingga sistem list Inbox pengguna bisa memampangkan pesan terbaru di barisan teratas tanpa repot join query tabel berulang-kali.
 */

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";

import { ChatRepository } from "../repositories/chat.repository";
import { EventEmitter2 } from "@nestjs/event-emitter";


@Injectable()
export class SendPesanChatUseCase {
  constructor(
    private readonly chatRepo: ChatRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    percakapanId: string,
    pengirimId: string,
    isiPesan: string,
    isAdmin = false,
  ) {
    const conversation = await this.chatRepo.findConversationById(percakapanId);

    if (!conversation) {
      throw new NotFoundException("Percakapan tidak ditemukan");
    }

    if (
      !isAdmin &&
      conversation.partisipanA !== pengirimId &&
      conversation.partisipanB !== pengirimId
    ) {
      throw new ForbiddenException(
        "Anda bukan partisipan dalam percakapan ini",
      );
    }

    // Gunakan repository untuk menjamin Message baru dibuat bersamaan dengan update status Conversation Parent.
    const [message] = await this.chatRepo.createMessageAndUpdateConversation(
      percakapanId,
      pengirimId,
      isiPesan,
    );

    // Emit event for real-time SSE
    this.eventEmitter.emit("chat.message.sent", {
      conversationId: percakapanId,
      message,
    });



    return message;
  }
}
