import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";

import { PenggunasRepository } from "../repositories/pengguna.repository";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { ActivityLogService } from "../../../common/services/activity-log.service";

@Injectable()
export class ToggleSellerStatusUseCase {
  constructor(
    private readonly usersRepo: PenggunasRepository,
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async execute(sellerId: string, aktif: boolean, adminId?: string) {
    const pengguna: any = await this.usersRepo.findUnique({
      where: { id: sellerId },
      include: { profilPenjual: { include: { toko: true } } },
    });

    if (!pengguna) {
      throw new NotFoundException("Pengguna tidak ditemukan");
    }

    if (pengguna.peran !== "PENJUAL") {
      throw new BadRequestException(
        "Hanya akun dengan peran PENJUAL yang bisa diaktifkan/nonaktifkan",
      );
    }

    // Update status aktif di pengguna
    await this.prisma.pengguna.update({
      where: { id: sellerId },
      data: { aktif },
    });

    // Update profil penjual status
    if (pengguna.profilPenjual) {
      await this.prisma.profilPenjual.update({
        where: { penggunaId: sellerId },
        data: {
          status: aktif ? "DISETUJUI" : "DITANGGUHKAN",
        },
      });

      // Update toko status juga
      if (pengguna.profilPenjual.toko) {
        await this.prisma.toko.update({
          where: { id: pengguna.profilPenjual.toko.id },
          data: { status: aktif ? "ACTIVE" : "SUSPENDED" },
        });
      }
    }

    // Log aktivitas
    await this.activityLog.log({
      penggunaId: adminId,
      kategori: "MANAJEMEN_AKUN",
      aksi: aktif ? "AKTIFKAN_SELLER" : "NONAKTIFKAN_SELLER",
      deskripsi: `Admin ${aktif ? "mengaktifkan" : "menonaktifkan"} akun seller: ${pengguna.nama || pengguna.email} (${pengguna.email})`,
      metadata: { sellerId, aktif },
    });

    return {
      statusCode: 200,
      message: aktif
        ? "Akun seller berhasil diaktifkan"
        : "Akun seller berhasil dinonaktifkan",
      data: {
        id: sellerId,
        email: pengguna.email,
        nama: pengguna.nama,
        aktif,
      },
    };
  }
}
