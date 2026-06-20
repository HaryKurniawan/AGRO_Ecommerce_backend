import { randomBytes } from "crypto";

import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { EmailService } from "../../../common/services/email.service";
import { RedisService } from "../../../infrastructure/redis/redis.service";

@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly redisService: RedisService,
  ) {}

  async execute(email: string) {
    const pengguna = await this.prisma.pengguna.findUnique({
      where: { email },
    });

    // Selalu return pesan sama (security: jangan bocorkan apakah email terdaftar)
    if (!pengguna || pengguna.googleId) {
      return {
        message: "Jika email terdaftar, instruksi reset telah dikirim.",
      };
    }

    const resetToken = randomBytes(32).toString("hex");

    // Simpan token ke Redis dengan TTL 1 jam (3600 detik)
    await this.redisService.getClient().set(
      `password:reset:${resetToken}`,
      pengguna.id,
      "EX",
      3600,
    );

    await this.emailService.sendPasswordReset(
      pengguna.email,
      resetToken,
      pengguna.nama || pengguna.email,
      pengguna.peran,
    );

    return { message: "Jika email terdaftar, instruksi reset telah dikirim." };
  }
}
