/**
 * Use Case: Admin Get CS Conversations
 *
 * Fungsi sentral khusus Customer Support Admin (Helpdesk).
 *
 * Kegunaan Bisnis:
 * - Menampilkan dashboard komprehensif bagi CS untuk menangani komplain, kritik, atau pertanyaan langsung.
 * - Mencari seluruh tipe Conversation `ADMIN_CS`.
 * - Serta mencari profil di antara partisipanA atau B untuk mendapatkan nama pelanggan dengan baik.
 */

import { Injectable } from "@nestjs/common";
import { TipeChat } from "@prisma/client";

import { ChatRepository } from "../repositories/chat.repository";

@Injectable()
export class AdminGetCsConversationsUseCase {
  constructor(private readonly chatRepo: ChatRepository) {}

  async execute(penggunaId: string) {
    const rawConversations = await this.chatRepo.findManyConversations({
      where: {
        tipe: TipeChat.ADMIN_CS,
      },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: {
            pesan: {
              where: {
                sudahDibaca: false,
                pengirimId: { not: penggunaId },
              },
            },
          },
        },
      },
      take: 50,
    });

    if (rawConversations.length === 0) return [];

    // Collect ALL participant IDs from all conversations
    const allUserIds = new Set<string>();
    rawConversations.forEach((conv) => {
      allUserIds.add(conv.partisipanA);
      allUserIds.add(conv.partisipanB);
    });

    // Fetch all participants with their roles AND seller profile for store name
    const allUsers = await this.chatRepo.findManyUsers({
      where: { id: { in: Array.from(allUserIds) } },
      select: {
        id: true,
        nama: true,
        email: true,
        peran: true,
        profilPenjual: {
          select: { namaToko: true },
        },
      },
    });
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    // Admin roles — the "other" user is whoever is NOT one of these
    const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN_CS"];

    const finalData = rawConversations.map((conv) => {
      const userA = userMap.get(conv.partisipanA) as any;
      const userB = userMap.get(conv.partisipanB) as any;

      // Customer is the participant who is NOT an admin
      let customer =
        userA && !ADMIN_ROLES.includes(userA.peran) ? userA : userB;
      // Fallback: if both are admins (admin-to-admin chat), pick the other one
      if (!customer || ADMIN_ROLES.includes(customer.peran)) {
        customer = conv.partisipanA === penggunaId ? userB : userA;
      }

      // For PENJUAL users, prefer store name over personal name
      const displayName =
        customer?.peran === "PENJUAL"
          ? customer.profilPenjual?.namaToko || customer.nama || null
          : customer?.nama || null;

      return {
        id: conv.id,
        partisipanA: conv.partisipanA,
        partisipanB: conv.partisipanB,
        lastMessage: conv.pesanTerakhir,
        lastMessageAt: conv.waktuPesanTerakhir,
        customer: customer
          ? {
              id: customer.id,
              name: displayName,
              email: customer.email || "",
            }
          : null,
        unreadCount: (conv as any)._count?.pesan || 0,
        updatedAt: conv.updatedAt,
      };
    });

    return finalData;
  }
}
