import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class UpdateProfileUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    penggunaId: string,
    data: { nama?: string; noTelepon?: string },
  ) {
    const existing = await this.prisma.pengguna.findUnique({ where: { id_pengguna: penggunaId },
      select: { noTelepon: true },
    });

    if (!existing) {
      throw new BadRequestException("Pengguna tidak ditemukan");
    }

    const isPhoneChanged =
      data.noTelepon !== undefined &&
      data.noTelepon !== existing.noTelepon;

    const updated = await this.prisma.pengguna.update({ where: { id_pengguna: penggunaId },
      data: {
        ...(data.nama && { nama: data.nama }),
        ...(data.noTelepon !== undefined && {
          noTelepon: data.noTelepon,
        }),
        ...(isPhoneChanged && {
          noTeleponTerverifikasiPada: new Date(), // Otomatis terverifikasi tanpa OTP
        }),
      },
    });

    return updated;
  }
}

