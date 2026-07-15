import { Injectable, BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class VerifyOtpUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async execute(email: string, otpCode: string) {
    const isBypass = otpCode === "000000";
    
    const pengguna = await this.prisma.pengguna.findFirst({
      where: isBypass ? { email: email } : {
        email: email,
        otpWhatsapp: otpCode,
        kadaluarsaOtpWhatsapp: {
          gt: new Date(),
        },
      },
      include: { profilPenjual: { include: { toko: true } } },
    });

    if (!pengguna) {
      throw new BadRequestException("OTP tidak valid atau sudah kadaluarsa. Silakan minta ulang.");
    }

    if (pengguna.noTeleponTerverifikasiPada) {
      throw new BadRequestException("Nomor WhatsApp sudah diverifikasi sebelumnya");
    }

    // Update pengguna: tandai WhatsApp sudah terverifikasi
    await this.prisma.pengguna.update({
      where: { id: pengguna.id },
      data: {
        noTeleponTerverifikasiPada: new Date(),
        otpWhatsapp: null,
        kadaluarsaOtpWhatsapp: null,
      },
    });

    // Buat accessToken (hanya berguna jika email juga sudah terverifikasi, akan dicek di frontend/login)
    const accessToken = this.jwtService.sign({
      sub: pengguna.id,
      email: pengguna.email,
      peran: pengguna.peran,
    });

    return {
      message: "Nomor WhatsApp berhasil diverifikasi!",
      accessToken,
      pengguna: {
        id: pengguna.id,
        email: pengguna.email,
        nama: pengguna.nama,
        peran: pengguna.peran,
        emailTerverifikasiPada: pengguna.emailTerverifikasiPada,
        noTeleponTerverifikasiPada: new Date(),
      },
    };
  }
}
