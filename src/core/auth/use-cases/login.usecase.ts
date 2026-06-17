import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { comparePassword } from "../../../common/utils/hash.util";
import { LoginDto } from "../dto/login.dto";
import { ActivityLogService } from "../../../common/services/activity-log.service";

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async execute(
    dto: LoginDto,
    reqInfo?: { ipAddress?: string; userAgent?: string },
  ) {
    const pengguna = await this.prisma.pengguna.findUnique({
      where: { email: dto.email },
      include: { profilPenjual: true },
    });

    if (!pengguna) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await comparePassword(
      dto.kataSandi,
      pengguna.kataSandi,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!pengguna.emailTerverifikasiPada) {
      throw new UnauthorizedException(
        "Email belum diverifikasi. Silakan cek inbox email Anda.",
      );
    }

    // Cek apakah akun seller dinonaktifkan oleh admin
    if (!pengguna.aktif) {
      // Ambil nomor telepon admin dari database
      const admin = await this.prisma.pengguna.findFirst({
        where: { peran: { in: ["SUPER_ADMIN", "ADMIN_CS"] } },
        select: { noTelepon: true },
        orderBy: { createdAt: "asc" },
      });
      const adminPhone = admin?.noTelepon || "0812-0000-0000";
      throw new UnauthorizedException(
        `Akun Anda telah dinonaktifkan oleh Admin. Anda tidak dapat mengakses fitur apapun. Silakan hubungi Admin untuk informasi lebih lanjut di nomor: ${adminPhone}`,
      );
    }

    if (
      dto.allowedRoles?.length &&
      !dto.allowedRoles.includes(pengguna.peran)
    ) {
      throw new UnauthorizedException(
        "Email ini terdaftar di aplikasi Agro lain. Silakan gunakan email lain untuk login di aplikasi ini.",
      );
    }

    const accessToken = this.jwtService.sign({
      sub: pengguna.id,
      email: pengguna.email,
      peran: pengguna.peran,
    });

    // Record login activity
    await this.activityLog.log({
      penggunaId: pengguna.id,
      kategori: "AUTENTIKASI",
      aksi: "LOGIN",
      deskripsi: `${
        pengguna.peran === "PENJUAL" && pengguna.profilPenjual?.namaToko
          ? `Toko ${pengguna.profilPenjual.namaToko}`
          : `Pengguna ${pengguna.nama || pengguna.email}`
      } (${pengguna.peran}) berhasil login ke sistem`,
      ipAddress: reqInfo?.ipAddress,
      userAgent: reqInfo?.userAgent,
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
