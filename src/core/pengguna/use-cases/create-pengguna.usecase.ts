import { randomBytes } from "crypto";

import { Injectable, ConflictException } from "@nestjs/common";
import * as bcrypt from "bcrypt";

import { PenggunasRepository } from "../repositories/pengguna.repository";
import { EmailService } from "../../../common/services/email.service";

/**
 * Generic user creation use case — supports all roles.
 */
@Injectable()
export class CreateUserUseCase {
  constructor(
    private readonly usersRepo: PenggunasRepository,
    private readonly emailService: EmailService,
  ) {}

  async execute(dto: any) {
    const { kataSandi, ...rest } = dto;

    // 1️⃣ Check duplicate email
    const existing = await this.usersRepo.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException("Email already in use");
    }

    // 2️⃣ Hash password
    const hashedPassword = await bcrypt.hash(kataSandi, 10);

    // 3️⃣ Generate verification token
    const verifyToken = randomBytes(32).toString("hex");
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 4️⃣ Create pengguna
    const pengguna = await this.usersRepo.create({
      data: {
        ...rest,
        kataSandi: hashedPassword,
        tokenVerifikasiEmail: verifyToken,
        kadaluarsaTokenEmail: verifyExpiry,
      },
      select: {
        id: true,
        email: true,
        nama: true,
        peran: true,
        noTelepon: true,
      },
    });

    // 5️⃣ Send welcome email with credentials & verification link
    await this.emailService.sendAdminCreatedWelcomeEmail(
      pengguna.email,
      pengguna.nama || pengguna.email,
      pengguna.peran,
      kataSandi,
      pengguna.noTelepon,
      verifyToken,
    );

    return {
      statusCode: 201,
      message: "Akun berhasil dibuat dan email verifikasi telah dikirim",
      data: pengguna,
    };
  }
}
