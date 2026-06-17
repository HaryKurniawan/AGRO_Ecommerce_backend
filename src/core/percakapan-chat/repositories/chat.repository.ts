import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Conversation Operations ───────────────────────────────────────────────

  async findConversationById(id: string) {
    return this.prisma.percakapanChat.findUnique({
      where: { id },
    });
  }

  async findConversationFirst(args: Prisma.PercakapanChatFindFirstArgs) {
    return this.prisma.percakapanChat.findFirst(args);
  }

  async findConversationUnique(args: Prisma.PercakapanChatFindUniqueArgs) {
    return this.prisma.percakapanChat.findUnique(args);
  }

  async findManyConversations(args: Prisma.PercakapanChatFindManyArgs) {
    return this.prisma.percakapanChat.findMany(args);
  }

  async countConversations(args: Prisma.PercakapanChatCountArgs) {
    return this.prisma.percakapanChat.count(args);
  }

  async createConversation(data: Prisma.PercakapanChatCreateInput) {
    return this.prisma.percakapanChat.create({
      data,
    });
  }

  async updateConversation(id: string, data: Prisma.PercakapanChatUpdateInput) {
    return this.prisma.percakapanChat.update({
      where: { id },
      data,
    });
  }

  // ─── Message Operations ────────────────────────────────────────────────────

  async findManyMessages(args: Prisma.PesanChatFindManyArgs) {
    return this.prisma.pesanChat.findMany(args);
  }

  async countMessages(args: Prisma.PesanChatCountArgs) {
    return this.prisma.pesanChat.count(args);
  }

  async createMessage(data: Prisma.PesanChatCreateInput) {
    return this.prisma.pesanChat.create({
      data,
    });
  }

  async updateManyMessages(args: Prisma.PesanChatUpdateManyArgs) {
    return this.prisma.pesanChat.updateMany(args);
  }

  async createMessageAndUpdateConversation(
    percakapanId: string,
    pengirimId: string,
    isiPesan: string,
  ) {
    return this.prisma.$transaction([
      this.prisma.pesanChat.create({
        data: {
          percakapanId,
          pengirimId,
          isiPesan,
        },
      }),
      this.prisma.percakapanChat.update({
        where: { id: percakapanId },
        data: {
          pesanTerakhir:
            isiPesan.length > 100
              ? isiPesan.substring(0, 100) + "..."
              : isiPesan,
          waktuPesanTerakhir: new Date(),
        },
      }),
    ]);
  }

  // ─── Helper Metadata Operations ────────────────────────────────────────────

  async findUserById(id: string, select?: Prisma.PenggunaSelect) {
    return this.prisma.pengguna.findUnique({
      where: { id },
      select,
    });
  }

  async findManyUsers(args: Prisma.PenggunaFindManyArgs) {
    return this.prisma.pengguna.findMany(args);
  }

  async findAdminUser() {
    return this.prisma.pengguna.findFirst({
      where: {
        peran: { in: ["ADMIN_CS", "SUPER_ADMIN"] },
      },
      select: { id: true, nama: true, email: true },
    });
  }

  async findStoreById(id: string, select?: Prisma.TokoSelect) {
    return this.prisma.toko.findUnique({
      where: { id },
      select,
    });
  }

  async findManyStores(args: Prisma.TokoFindManyArgs) {
    return this.prisma.toko.findMany(args);
  }

  async findStoreWithOwner(tokoId: string) {
    return this.prisma.toko.findUnique({
      where: { id: tokoId },
      include: {
        penjual: {
          select: { penggunaId: true },
        },
      },
    });
  }
}
