/**
 * Use Case: Get Pengguna Conversations List
 *
 * Fungsi ini digunakan untuk menampilkan tampilan "Inbox" utama bagi pengguna.
 *
 * Kegunaan Bisnis:
 * - Mengembalikan daftar seluruh rekam obrolan milik spesifik pengguna (yang ada namanya di partisipan A atau B),
 *   diurutkan berdasarkan interaksi yang paling baru.
 * - Berperan juga dalam memuat nama metadata seperti nama pelanggan atau nama toko agar valid untuk dirender UI.
 */

import { Injectable } from "@nestjs/common";
import { TipeChat } from "@prisma/client";

import { ChatRepository } from "../repositories/chat.repository";

@Injectable()
export class GetUserConversationsUseCase {
  constructor(private readonly chatRepo: ChatRepository) {}

  async execute(penggunaId: string) {
    const rawConversations = await this.chatRepo.findManyConversations({
      where: {
        OR: [{ partisipanA: penggunaId }, { partisipanB: penggunaId }],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: {
            pesan: {
              where: {
                sudahDibaca: false,
                pengirimId: { not: penggunaId }, // Menghitung hanya pesan dari lawan bicara yang belum dibaca
              },
            },
          },
        },
      },
    });

    if (rawConversations.length === 0) return [];

    // Mengumpulkan total unique Pengguna IDs and Toko IDs agar bisa dilakukan batch query metadata profile-nya
    const userIds = new Set<string>();
    const storeIds = new Set<string>();

    rawConversations.forEach((conv) => {
      const otherId =
        conv.partisipanA === penggunaId ? conv.partisipanB : conv.partisipanA;
      if (conv.tipe !== TipeChat.ADMIN_CS) {
        userIds.add(otherId);
      }
      if (conv.tokoId) storeIds.add(conv.tokoId);
    });

    // Mengambil metadata profil menggunakan batch Promises
    const [pengguna, toko] = await Promise.all([
      userIds.size > 0
        ? this.chatRepo.findManyUsers({
            where: { id: { in: Array.from(userIds) } },
            select: { id: true, nama: true },
          })
        : Promise.resolve([]),
      storeIds.size > 0
        ? this.chatRepo.findManyStores({
            where: { id: { in: Array.from(storeIds) } },
            select: { id: true, nama: true, fotoUrl: true },
          })
        : Promise.resolve([]),
    ]);

    const userMap = new Map(pengguna.map((u) => [u.id, u.nama]));
    const storeMap = new Map(
      toko.map((s) => [s.id, { nama: s.nama, foto: s.fotoUrl }]),
    );

    // Pemrosesan perakitan akhir data dan mapping Unread count per kamar
    const enhancedConversations = rawConversations.map((conv) => {
      const isA = conv.partisipanA === penggunaId;
      const otherId = isA ? conv.partisipanB : conv.partisipanA;

      let otherName = "Seseorang";
      let otherFoto: string | null = null;

      if (conv.tipe === TipeChat.ADMIN_CS) {
        otherName = "Customer Support";
      } else {
        otherName = userMap.get(otherId) || "Unknown Pengguna";
      }

      if (conv.tokoId) {
        const storeMeta = storeMap.get(conv.tokoId);
        if (storeMeta && !isA) {
          otherName = storeMeta.nama;
          otherFoto = storeMeta.foto;
        }
      }

      return {
        id: conv.id,
        tipe: conv.tipe,
        otherParticipantId: otherId,
        otherParticipantName: otherName,
        otherParticipantFoto: otherFoto,
        pesanTerakhir: conv.pesanTerakhir,
        waktuPesanTerakhir: conv.waktuPesanTerakhir,
        unreadCount: (conv as any)._count?.pesan || 0,
        updatedAt: conv.updatedAt,
      };
    });

    return enhancedConversations;
  }
}
