import { randomBytes } from "crypto";

import { Injectable, ConflictException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { hashPassword } from "../../../common/utils/hash.util";
import { EmailService } from "../../../common/services/email.service";
import { RegisterDto } from "../dto/register.dto";

@Injectable()
export class RegisterUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async execute(dto: RegisterDto) {
    const existingUser = await this.prisma.pengguna.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException("Email already registered");
    }

    const hashedPassword = await hashPassword(dto.kataSandi);

    // Generate token verifikasi (random 64 hex chars)
    const verifyToken = randomBytes(32).toString("hex");

    const pengguna = await this.prisma.pengguna.create({
      data: {
        email: dto.email,
        kataSandi: hashedPassword,
        nama: dto.nama,
        peran: dto.peran || "KONSUMEN",
        // Set legacy fields to null
        tokenVerifikasiEmail: verifyToken,
        kadaluarsaTokenEmail: new Date(Date.now() + 86400 * 1000), // 24 hours
      },
    });

    // Kirim email verifikasi
    await this.emailService.sendEmailVerification(
      pengguna.email,
      verifyToken,
      pengguna.nama || pengguna.email,
      pengguna.peran,
    );

    // Kembalikan info tanpa accessToken — pengguna harus verifikasi dulu
    return {
      message:
        "Registration successful. Please check your email for verification.",
      email: pengguna.email,
    };
  }
}
