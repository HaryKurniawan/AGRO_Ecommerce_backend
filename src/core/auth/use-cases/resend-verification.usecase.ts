import { randomBytes } from "crypto";

import { Injectable, BadRequestException } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { EmailService } from "../../../common/services/email.service";
import { RedisService } from "../../../infrastructure/redis/redis.service";

@Injectable()
export class ResendVerificationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly redisService: RedisService,
  ) {}

  async execute(email: string) {
    const pengguna = await this.prisma.pengguna.findUnique({
      where: { email },
    });

    if (!pengguna) {
      // Respons sama agar tidak bocorkan info pengguna terdaftar atau tidak
      return {
        message: "Jika email terdaftar, link verifikasi baru telah dikirim.",
      };
    }

    if (pengguna.emailTerverifikasiPada) {
      throw new BadRequestException("Email ini sudah terverifikasi.");
    }

    const verifyToken = randomBytes(32).toString("hex");

    // Simpan token ke Redis dengan TTL 24 jam (86400 detik)
    await this.redisService.getClient().set(
      `email:verify:${verifyToken}`,
      pengguna.id,
      "EX",
      86400,
    );

    await this.emailService.sendEmailVerification(
      pengguna.email,
      verifyToken,
      pengguna.nama || pengguna.email,
    );

    return {
      message: "Jika email terdaftar, link verifikasi baru telah dikirim.",
    };
  }
}
