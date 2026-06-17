import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { hashPassword } from "../../../common/utils/hash.util";

@Injectable()
export class CreateGuestSessionUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async execute() {
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    const guestName = `Tamu_${randomStr}`;
    const guestEmail = `guest_${randomStr.toLowerCase()}@agro.guest`;
    const randomPassword =
      Math.random().toString(36).slice(-10) +
      Math.random().toString(36).toUpperCase().slice(-10) +
      "!@#$";

    const hashedPassword = await hashPassword(randomPassword);

    const pengguna = await this.prisma.pengguna.create({
      data: {
        nama: guestName,
        email: guestEmail,
        kataSandi: hashedPassword,
        peran: "KONSUMEN",
      },
    });

    const accessToken = this.jwtService.sign({
      sub: pengguna.id,
      email: pengguna.email,
      peran: pengguna.peran,
    });

    return {
      message: "Guest session created successfully",
      guestToken: accessToken,
      pengguna: {
        id: pengguna.id,
        nama: pengguna.nama,
        email: pengguna.email,
        peran: pengguna.peran,
      },
    };
  }
}
