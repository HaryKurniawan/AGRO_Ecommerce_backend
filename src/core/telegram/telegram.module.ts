import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TelegramService } from "./telegram.service";

/**
 * TelegramModule - Global
 *
 * Di-mark @Global() agar TelegramService langsung tersedia di seluruh modul
 * tanpa harus import ulang di setiap modul yang membutuhkannya.
 */
import { PerTokoTelegramService } from "./per-toko-telegram.service";
import { PrismaService } from "../../infrastructure/database/prisma.service";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [TelegramService, PerTokoTelegramService, PrismaService],
  exports: [TelegramService, PerTokoTelegramService],
})
export class TelegramModule {}
