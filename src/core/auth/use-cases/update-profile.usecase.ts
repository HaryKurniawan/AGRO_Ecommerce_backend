import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { WhatsappService } from "../../../infrastructure/whatsapp/whatsapp.service";

@Injectable()
export class UpdateProfileUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappService,
  ) {}

  async execute(
    penggunaId: string,
    data: { nama?: string; noTelepon?: string },
  ) {
    const existing = await this.prisma.pengguna.findUnique({
      where: { id: penggunaId },
      select: { noTelepon: true },
    });

    if (!existing) {
      throw new BadRequestException("Pengguna tidak ditemukan");
    }

    const isPhoneChanged =
      data.noTelepon !== undefined &&
      data.noTelepon !== existing.noTelepon;

    let otpCode: string | null = null;
    let kadaluarsaOtpWhatsapp: Date | null = null;

    if (isPhoneChanged) {
      otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      kadaluarsaOtpWhatsapp = new Date(Date.now() + 5 * 60 * 1000); // 5 menit
    }

    const updated = await this.prisma.pengguna.update({
      where: { id: penggunaId },
      data: {
        ...(data.nama && { nama: data.nama }),
        ...(data.noTelepon !== undefined && {
          noTelepon: data.noTelepon,
        }),
        ...(isPhoneChanged && {
          noTeleponTerverifikasiPada: null,
          otpWhatsapp: otpCode,
          kadaluarsaOtpWhatsapp,
        }),
      },
    });

    if (isPhoneChanged && data.noTelepon) {
      await this.whatsappService.sendMessage(
        data.noTelepon,
        `*AGRO JABAR*\n\nAnda mengubah nomor telepon. Kode OTP Anda adalah: *${otpCode}*.\n\nJANGAN berikan kode ini kepada siapapun.`,
      );
    }

    return updated;
  }
}

