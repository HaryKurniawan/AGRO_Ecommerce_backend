import { randomBytes } from "crypto";

import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { EmailService } from "../../../common/services/email.service";


@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
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

    const kadaluarsaTokenReset = new Date();
    kadaluarsaTokenReset.setHours(kadaluarsaTokenReset.getHours() + 1);

    await this.prisma.pengguna.update({
      where: { id: pengguna.id },
      data: {
        tokenResetKataSandi: resetToken,
        kadaluarsaTokenReset,
      },
    });

    await this.emailService.sendPasswordReset(
      pengguna.email,
      resetToken,
      pengguna.nama || pengguna.email,
      pengguna.peran,
    );

    return { message: "Jika email terdaftar, instruksi reset telah dikirim." };
  }
}
