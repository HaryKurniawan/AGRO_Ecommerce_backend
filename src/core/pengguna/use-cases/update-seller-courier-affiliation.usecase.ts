import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";

import { PenggunasRepository } from "../repositories/pengguna.repository";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { ActivityLogService } from "../../../common/services/activity-log.service";

@Injectable()
export class UpdateSellerCourierAffiliationUseCase {
  constructor(
    private readonly usersRepo: PenggunasRepository,
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async execute(tokoId: string, data: any, adminId?: string) {
    const {
      action,
      courierUserId,
      courierName,
      courierEmail,
      courierPassword,
      courierPhone,
    } = data;

    // Verify if store exists
    const store = await this.prisma.toko.findUnique({
      where: { id: tokoId },
      include: { kurirStaffs: true },
    });
    if (!store) {
      throw new NotFoundException("Toko tidak ditemukan");
    }

    if (action === "assign") {
      if (!courierUserId) {
        throw new BadRequestException("ID kurir wajib diisi untuk penugasan");
      }

      // Check if courier exists and is indeed a courier
      const courier = await this.usersRepo.findUnique({
        where: { id: courierUserId },
      });
      if (!courier || courier.peran !== "KURIR") {
        throw new BadRequestException(
          "Pengguna bukan merupakan kurir terdaftar",
        );
      }

      // Assign courier to store
      await this.usersRepo.update({
        where: { id: courierUserId },
        data: { kurirTokoId: tokoId },
      });

      // Update store's primary courier if it was empty
      if (!store.courierStaffId) {
        await this.prisma.toko.update({
          where: { id: tokoId },
          data: { courierStaffId: courierUserId },
        });
      }

      // Record activity log
      await this.activityLog.log({
        penggunaId: adminId,
        kategori: "MANAJEMEN_AKUN",
        aksi: "AFILIASI_KURIR_DIHUBUNGKAN",
        deskripsi: `Admin menghubungkan Kurir ${courier.nama} (${courier.email}) ke Toko ${store.nama}`,
        metadata: { tokoId, courierUserId },
      });

      return {
        statusCode: 200,
        message: "Kurir berhasil diafiliasikan ke toko.",
      };
    }

    if (action === "remove") {
      // Find all couriers currently affiliated with this store
      const currentCouriers = await this.prisma.pengguna.findMany({
        where: { kurirTokoId: tokoId, peran: "KURIR" },
      });

      // Safeguard: Cannot have less than 1 courier
      if (currentCouriers.length <= 1) {
        throw new BadRequestException(
          "Toko harus memiliki minimal 1 kurir terhubung.",
        );
      }

      // Determine which courier to remove. If none specified, remove the one that matches store.courierStaffId
      let targetCourierId = courierUserId;
      if (!targetCourierId) {
        targetCourierId = store.courierStaffId || currentCouriers[0]?.id;
      }

      if (!targetCourierId) {
        throw new BadRequestException(
          "Kurir yang akan dilepas tidak ditemukan.",
        );
      }

      // Find the courier's information before unlinking for the log description
      const targetCourier = await this.prisma.pengguna.findUnique({
        where: { id: targetCourierId },
      });

      // Unlink courier
      await this.usersRepo.update({
        where: { id: targetCourierId },
        data: { kurirTokoId: null },
      });

      // If we removed the primary courierStaffId, reassign it to another remaining courier
      if (store.courierStaffId === targetCourierId) {
        const remainingCourier = currentCouriers.find(
          (c) => c.id !== targetCourierId,
        );
        await this.prisma.toko.update({
          where: { id: tokoId },
          data: {
            courierStaffId: remainingCourier ? remainingCourier.id : null,
          },
        });
      }

      // Record activity log
      await this.activityLog.log({
        penggunaId: adminId,
        kategori: "MANAJEMEN_AKUN",
        aksi: "AFILIASI_KURIR_DILEPAS",
        deskripsi: `Admin melepas Kurir ${targetCourier?.nama || "Kurir"} (${targetCourier?.email || ""}) dari Toko ${store.nama}`,
        metadata: { tokoId, courierUserId: targetCourierId },
      });

      return {
        statusCode: 200,
        message: "Afiliasi kurir berhasil dilepas dari toko.",
      };
    }

    if (action === "create_new") {
      if (!courierName || !courierEmail || !courierPassword) {
        throw new BadRequestException(
          "Nama, email, dan password wajib diisi untuk kurir baru",
        );
      }

      // Check if email already registered
      const existingUser = await this.usersRepo.findUnique({
        where: { email: courierEmail },
      });
      if (existingUser) {
        throw new ConflictException("Email kurir sudah terdaftar");
      }

      const hashedPassword = await bcrypt.hash(courierPassword, 10);

      // Create new courier
      const newCourier = await this.usersRepo.create({
        data: {
          nama: courierName,
          email: courierEmail,
          kataSandi: hashedPassword,
          peran: "KURIR",
          noTelepon: courierPhone || "",
          kurirTokoId: tokoId,
        },
      });

      // If store had no primary courier, assign this new one
      if (!store.courierStaffId) {
        await this.prisma.toko.update({
          where: { id: tokoId },
          data: { courierStaffId: newCourier.id },
        });
      }

      // Record activity log
      await this.activityLog.log({
        penggunaId: adminId,
        kategori: "MANAJEMEN_AKUN",
        aksi: "BUAT_AKUN_KURIR",
        deskripsi: `Admin membuat akun Kurir baru ${newCourier.nama} (${newCourier.email}) dan diafiliasikan ke Toko ${store.nama}`,
        metadata: { tokoId, courierUserId: newCourier.id },
      });

      return {
        statusCode: 201,
        message: "Kurir baru berhasil dibuat dan diafiliasikan ke toko.",
        data: {
          id: newCourier.id,
          nama: newCourier.nama,
          email: newCourier.email,
        },
      };
    }

    throw new BadRequestException("Aksi tidak valid");
  }
}
