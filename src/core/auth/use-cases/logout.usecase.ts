import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { ActivityLogService } from "../../../common/services/activity-log.service";

@Injectable()
export class LogoutUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async execute(
    penggunaId: string,
    reqInfo?: { ipAddress?: string; userAgent?: string },
  ) {
    const pengguna = await this.prisma.pengguna.findUnique({
      where: { id: penggunaId },
      include: { profilPenjual: true },
    });
    if (pengguna) {
      await this.activityLog.log({
        penggunaId,
        kategori: "AUTENTIKASI",
        aksi: "LOGOUT",
        deskripsi: `${
          pengguna.peran === "PENJUAL" && pengguna.profilPenjual?.namaToko
            ? `Toko ${pengguna.profilPenjual.namaToko}`
            : `Pengguna ${pengguna.nama || pengguna.email}`
        } (${pengguna.peran}) berhasil logout dari sistem`,
        ipAddress: reqInfo?.ipAddress,
        userAgent: reqInfo?.userAgent,
      });
    }
    return { success: true };
  }
}
