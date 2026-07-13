import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { WhatsappService } from "../../../infrastructure/whatsapp/whatsapp.service";

@Injectable()
export class RequestOtpUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappService,
  ) {}

  async execute(email: string, noTelepon?: string) {
    const pengguna = await this.prisma.pengguna.findUnique({
      where: { email },
    });

    if (!pengguna) {
      throw new BadRequestException("Pengguna tidak ditemukan");
    }

    if (pengguna.noTeleponTerverifikasiPada) {
      throw new BadRequestException("Nomor WhatsApp sudah diverifikasi");
    }

    // Gunakan nomor telepon baru atau yang sudah ada
    const targetTelepon = noTelepon || pengguna.noTelepon;

    if (!targetTelepon) {
      throw new BadRequestException("Nomor WhatsApp belum diatur");
    }

    // Generate token OTP (6 digit angka)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Update database
    await this.prisma.pengguna.update({
      where: { id: pengguna.id },
      data: {
        noTelepon: targetTelepon,
        otpWhatsapp: otpCode,
        kadaluarsaOtpWhatsapp: new Date(Date.now() + 5 * 60 * 1000), // 5 menit
      },
    });

    // Kirim OTP via WA
    await this.whatsappService.sendMessage(
      targetTelepon,
      `*AGRO JABAR*\n\nKode OTP Anda adalah: *${otpCode}*.\n\nJANGAN berikan kode ini kepada siapapun.`,
    );

    return {
      message: "Kode OTP berhasil dikirim ke WhatsApp Anda.",
    };
  }
}
