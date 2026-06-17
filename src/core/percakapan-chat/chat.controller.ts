import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Sse,
  MessageEvent,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Observable, fromEvent, interval, merge } from "rxjs";
import { map, filter } from "rxjs/operators";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { SkipTransform } from "../../common/decorators/skip-transform.decorator";

import { JwtAuthGuard } from "../../core/auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-pengguna.decorator";

// Use Cases
import { FindOrCreateConversationUseCase } from "./use-cases/find-or-create-conversation.usecase";
import { GetUserConversationsUseCase } from "./use-cases/get-pengguna-conversations.usecase";
import { GetConversationMessagesUseCase } from "./use-cases/get-conversation-messages.usecase";
import { SendPesanChatUseCase } from "./use-cases/send-chat-message.usecase";
import { MarkConversationReadUseCase } from "./use-cases/mark-conversation-read.usecase";
import { GetTotalUnreadMessagesUseCase } from "./use-cases/get-total-unread-messages.usecase";
import { AdminGetCsConversationsUseCase } from "./use-cases/admin-get-cs-conversations.usecase";
import { ChatRepository } from "./repositories/chat.repository";

import { CreateConversationDto } from "./dto/create-conversation.dto";
import { SendChatMessageDto } from "./dto/send-chat-message.dto";

@ApiTags("Chat")
@Controller("chat")
export class ChatController {
  constructor(
    private readonly chatRepo: ChatRepository,
    private readonly findOrCreateConversationUseCase: FindOrCreateConversationUseCase,
    private readonly getUserConversationsUseCase: GetUserConversationsUseCase,
    private readonly getConversationMessagesUseCase: GetConversationMessagesUseCase,
    private readonly sendPesanChatUseCase: SendPesanChatUseCase,
    private readonly markConversationReadUseCase: MarkConversationReadUseCase,
    private readonly getTotalUnreadMessagesUseCase: GetTotalUnreadMessagesUseCase,
    private readonly adminGetCsConversationsUseCase: AdminGetCsConversationsUseCase,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── Create / Find Conversation ──────────────────────────────────────────────

  @Post("conversations")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create or get existing conversation" })
  async createConversation(
    @CurrentUser("sub") penggunaId: string,
    @Body() payload: CreateConversationDto,
  ): Promise<any> {
    if (payload.tipe === "CHAT_PENJUAL") {
      if (!payload.tokoId) {
        throw new BadRequestException("tokoId wajib diisi untuk chat penjual");
      }

      const toko = await this.chatRepo.findStoreWithOwner(payload.tokoId);
      if (!toko) {
        throw new NotFoundException("Toko tidak ditemukan");
      }

      return this.findOrCreateConversationUseCase.execute(
        "CHAT_PENJUAL",
        penggunaId,
        toko.penjual.penggunaId,
        payload.tokoId,
      );
    }

    // ADMIN_CS
    if (payload.targetUserId) {
      return this.findOrCreateConversationUseCase.execute(
        "ADMIN_CS",
        penggunaId,
        payload.targetUserId,
      );
    }

    const admin = await this.chatRepo.findAdminUser();
    if (!admin) {
      throw new BadRequestException("Tidak ada admin yang tersedia saat ini");
    }

    return this.findOrCreateConversationUseCase.execute(
      "ADMIN_CS",
      penggunaId,
      admin.id,
    );
  }

  // ── List Conversations ──────────────────────────────────────────────────────

  @Get("conversations")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get pengguna conversations" })
  async getConversations(@CurrentUser("sub") penggunaId: string): Promise<any> {
    return this.getUserConversationsUseCase.execute(penggunaId);
  }

  // ── Get Conversation Detail ─────────────────────────────────────────────────

  @Get("conversations/:id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get conversation with messages" })
  async getConversation(
    @CurrentUser("sub") penggunaId: string,
    @CurrentUser("peran") peran: string,
    @Param("id") id: string,
  ): Promise<any> {
    const isAdmin = peran === "SUPER_ADMIN" || peran === "ADMIN_CS";
    return this.getConversationMessagesUseCase.execute(id, penggunaId, isAdmin);
  }

  @Sse("stream")
  @SkipTransform()
  @ApiOperation({ summary: "Stream general chat notifications" })
  streamChatNotifications(): Observable<MessageEvent> {
    const updates$ = fromEvent(this.eventEmitter, "chat.message.sent").pipe(
      map((payload: any) => ({
        data: payload,
      })),
    );

    const heartbeat$ = interval(15000).pipe(
      map(() => ({ data: { type: "heartbeat" } })),
    );

    return merge(updates$, heartbeat$);
  }

  @Sse("conversations/:id/stream")
  @SkipTransform()
  @ApiOperation({ summary: "Stream conversation messages" })
  streamMessages(@Param("id") id: string): Observable<MessageEvent> {
    const updates$ = fromEvent(this.eventEmitter, "chat.message.sent").pipe(
      filter((payload: any) => String(payload.conversationId) === String(id)),
      map((payload: any) => {
        return {
          data: payload.message,
        };
      }),
    );

    const heartbeat$ = interval(15000).pipe(
      map(() => ({ data: { type: "heartbeat" } })),
    );

    return merge(updates$, heartbeat$);
  }

  // ── Send Message ────────────────────────────────────────────────────────────

  @Post("conversations/:id/messages")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Send a message" })
  async sendMessage(
    @CurrentUser("sub") penggunaId: string,
    @CurrentUser("peran") peran: string,
    @Param("id") id: string,
    @Body() payload: SendChatMessageDto,
  ): Promise<any> {
    const isAdmin = peran === "SUPER_ADMIN" || peran === "ADMIN_CS";
    return this.sendPesanChatUseCase.execute(
      id,
      penggunaId,
      payload.isiPesan.trim(),
      isAdmin,
    );
  }

  // ── Mark as Read ────────────────────────────────────────────────────────────

  @Patch("conversations/:id/read")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Mark messages as read" })
  async markAsRead(
    @CurrentUser("sub") penggunaId: string,
    @CurrentUser("peran") peran: string,
    @Param("id") id: string,
  ): Promise<any> {
    const isAdmin = peran === "SUPER_ADMIN" || peran === "ADMIN_CS";
    return this.markConversationReadUseCase.execute(id, penggunaId, isAdmin);
  }

  // ── Unread Count ────────────────────────────────────────────────────────────

  @Get("unread-count")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get total unread message count" })
  async getUnreadCount(@CurrentUser("sub") penggunaId: string): Promise<any> {
    return this.getTotalUnreadMessagesUseCase.execute(penggunaId);
  }

  // ── Admin: Get All CS Conversations ───────────────────────────────────

  @Get("admin/conversations")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Admin: get all CS conversations" })
  async adminGetConversations(
    @CurrentUser("sub") penggunaId: string,
  ): Promise<any> {
    return this.adminGetCsConversationsUseCase.execute(penggunaId);
  }

  @Get("admin/conversations/user/:userId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Admin: get all conversations for a specific user" })
  async adminGetUserConversations(
    @Param("userId") targetUserId: string,
  ): Promise<any> {
    return this.getUserConversationsUseCase.execute(targetUserId);
  }
}
