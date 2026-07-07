import { randomBytes } from "crypto";

import { Injectable, BadRequestException } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { EmailService } from "../../../common/services/email.service";


@Injectable()
export class ResendVerificationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
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

    await this.prisma.pengguna.update({
      where: { id: pengguna.id },
      data: {
        tokenVerifikasiEmail: verifyToken,
        kadaluarsaTokenEmail: new Date(Date.now() + 86400 * 1000), // 24 hours
      },
    });

    await this.emailService.sendEmailVerification(
      pengguna.email,
      verifyToken,
      pengguna.nama || pengguna.email,
      pengguna.peran,
    );

    return {
      message: "Jika email terdaftar, link verifikasi baru telah dikirim.",
    };
  }
}
