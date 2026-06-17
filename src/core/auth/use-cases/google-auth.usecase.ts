import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

export interface GoogleProfile {
  googleId: string;
  email: string;
  nama: string;
  picture?: string;
}

@Injectable()
export class GoogleAuthUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async execute(
    profile: GoogleProfile,
    options: { allowAutoRegister: boolean } = { allowAutoRegister: true },
  ) {
    // Cari pengguna berdasarkan googleId atau email
    let pengguna = await this.prisma.pengguna.findFirst({
      where: {
        OR: [{ googleId: profile.googleId }, { email: profile.email }],
      },
    });

    if (!pengguna && !options.allowAutoRegister) {
      throw new UnauthorizedException(
        "Akun tidak ditemukan. Silakan daftar terlebih dahulu.",
      );
    }

    if (!pengguna) {
      // Auto-register khusus Ecommerce (KONSUMEN)
      pengguna = await this.prisma.pengguna.create({
        data: {
          googleId: profile.googleId,
          email: profile.email,
          nama: profile.nama,
          kataSandi: "OAUTH_GOOGLE_USER", // Placeholder for OAuth users
          peran: "KONSUMEN",
          emailTerverifikasiPada: new Date(),
        },
      });
    } else if (!pengguna.googleId) {
      // Jika ditemukan via email tapi belum punya googleId, link akun
      pengguna = await this.prisma.pengguna.update({
        where: { id: pengguna.id },
        data: {
          googleId: profile.googleId,
          emailTerverifikasiPada: pengguna.emailTerverifikasiPada ?? new Date(),
        },
      });
    }

    const accessToken = this.jwtService.sign({
      sub: pengguna.id,
      email: pengguna.email,
      peran: pengguna.peran,
    });

    return {
      accessToken,
      pengguna: {
        id: pengguna.id,
        email: pengguna.email,
        nama: pengguna.nama,
        peran: pengguna.peran,
      },
    };
  }
}
