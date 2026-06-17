import { Module } from "@nestjs/common";

import { ChatController } from "./chat.controller";
import { ChatRepository } from "./repositories/chat.repository";

// Use Cases
import { FindOrCreateConversationUseCase } from "./use-cases/find-or-create-conversation.usecase";
import { GetUserConversationsUseCase } from "./use-cases/get-pengguna-conversations.usecase";
import { GetConversationMessagesUseCase } from "./use-cases/get-conversation-messages.usecase";
import { SendPesanChatUseCase } from "./use-cases/send-chat-message.usecase";
import { MarkConversationReadUseCase } from "./use-cases/mark-conversation-read.usecase";
import { GetTotalUnreadMessagesUseCase } from "./use-cases/get-total-unread-messages.usecase";
import { AdminGetCsConversationsUseCase } from "./use-cases/admin-get-cs-conversations.usecase";

const UseCases = [
  FindOrCreateConversationUseCase,
  GetUserConversationsUseCase,
  GetConversationMessagesUseCase,
  SendPesanChatUseCase,
  MarkConversationReadUseCase,
  GetTotalUnreadMessagesUseCase,
  AdminGetCsConversationsUseCase,
];

@Module({
  controllers: [ChatController],
  providers: [ChatRepository, ...UseCases],
  exports: [ChatRepository, ...UseCases],
})
export class ChatModule {}
