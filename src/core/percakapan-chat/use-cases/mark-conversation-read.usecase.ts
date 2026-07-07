/**
 * Use Case: Mark Conversation As Read
 *
 * Fungsi ini bertugas menghapus status "Unread" (Belum dibaca) pada daftar pesan di sebuah kamar utuh.
 *
 * Kegunaan Bisnis:
 * - Menghilangkan tanda notifikasi "titik merah / lencana angka" (Badge Count).
 * - Memberi fungsi centang ganda biru ke lawan jenis bahwa pesannya sudah dilihat.
 * - API dipanggil saat *pengguna* berhasil me-render UI dari dalam layar Detail Percakapan.
 */

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";

import { ChatRepository } from "../repositories/chat.repository";


@Injectable()
export class MarkConversationReadUseCase {
  constructor(
    private readonly chatRepo: ChatRepository,
  ) {}

  async execute(percakapanId: string, penggunaId: string, isAdmin = false) {
    const conversation = await this.chatRepo.findConversationById(percakapanId);

    if (!conversation) {
      throw new NotFoundException("Percakapan tidak ditemukan");
    }

    if (
      !isAdmin &&
      conversation.partisipanA !== penggunaId &&
      conversation.partisipanB !== penggunaId
    ) {
      throw new ForbiddenException(
        "Anda bukan partisipan dalam percakapan ini",
      );
    }

    // Melakukan update massal pada semua pesan yang belum terbaca (kecuali milik sendiri)
    const result = await this.chatRepo.updateManyMessages({
      where: {
        percakapanId,
        pengirimId: { not: penggunaId }, // Jangan mendeteksi pesan yang dia kirim sendiri
        sudahDibaca: false,
      },
      data: { sudahDibaca: true },
    });



    return {
      success: true,
      markedCount: result.count,
    };
  }
}
