import { randomBytes } from "crypto";
import {
  Injectable,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { Peran } from "@prisma/client";

import { PenggunasRepository } from "../repositories/pengguna.repository";
import { ActivityLogService } from "../../../common/services/activity-log.service";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { EmailService } from "../../../common/services/email.service";

@Injectable()
export class CreateSellerWithCourierUseCase {
  constructor(
    private readonly usersRepo: PenggunasRepository,
    private readonly activityLog: ActivityLogService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async execute(data: any, adminId?: string) {
    const nama = data.nama || data.name;
    const email = data.email;
    const kataSandi = data.kataSandi || data.password;
    const peran = data.peran || "PENJUAL";
    const noTelepon = data.noTelepon || data.phone || "";

    // Normalize courierData from flat payload if sent as flat params
    let courierData = data.courierData || null;
    if (!courierData && (data.courierName || data.courierEmail)) {
      courierData = {
        nama: data.courierName,
        email: data.courierEmail,
        kataSandi: data.courierPassword,
        noTelepon: data.courierPhone,
      };
    }

    // Validate Courier Data (only if provided)
    if (peran === "PENJUAL" && courierData) {
      if (
        !courierData.email ||
        !courierData.kataSandi ||
        !courierData.nama ||
        !courierData.noTelepon
      ) {
        throw new BadRequestException(
          "Jika menyediakan data kurir, semua field (nama, email, kataSandi, noTelepon) wajib diisi",
        );
      }
    }

    // Check if email already exists
    const existingUser = await this.usersRepo.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException("Email sudah terdaftar");
    }

    let newCourier = null;
    if (peran === "PENJUAL" && courierData) {
      const existingCourier = await this.usersRepo.findUnique({
        where: { email: courierData.email },
      });
      if (existingCourier) {
        throw new ConflictException("Email kurir sudah terdaftar");
      }
      const hashedCourierPassword = await bcrypt.hash(
        courierData.kataSandi,
        10,
      );
      const courierToken = randomBytes(32).toString("hex");
      const courierExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      newCourier = await this.usersRepo.create({
        data: {
          nama: courierData.nama,
          email: courierData.email,
          kataSandi: hashedCourierPassword,
          peran: "KURIR",
          noTelepon: courierData.noTelepon || "",
          tokenVerifikasiEmail: courierToken,
          kadaluarsaTokenEmail: courierExpiry,
        },
      });

      // Panggil email service untuk mengirim welcome & link verif
      await this.emailService.sendAdminCreatedWelcomeEmail(
        courierData.email,
        courierData.nama,
        "KURIR",
        courierData.kataSandi,
        courierData.noTelepon || "",
        courierToken,
      );
    }

    const hashedPassword = await bcrypt.hash(kataSandi, 10);
    const sellerToken = randomBytes(32).toString("hex");
    const sellerExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create the main user (Seller)
    const newUser = await this.usersRepo.create({
      data: {
        nama,
        email,
        kataSandi: hashedPassword,
        peran: peran as Peran,
        noTelepon: noTelepon,
        tokenVerifikasiEmail: sellerToken,
        kadaluarsaTokenEmail: sellerExpiry,
        // If it's a seller and we have warehouse info
        profilPenjual:
          peran === "PENJUAL"
            ? {
                create: {
                  namaToko: data.storeName || nama,
                  slugToko:
                    (data.storeName || email.split("@")[0])
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/(^-|-$)/g, "") +
                    "-" +
                    Math.random().toString(36).substring(2, 8),
                  noTelepon: data.storePhone || noTelepon,
                  alamat: data.storeAddress || "",
                  kota: data.storeCity || data.kabupaten || "",
                  provinsi: data.storeProvince || data.wilayah || "",
                  kodePos: data.storePostalCode || "",
                  deskripsiToko: data.storeDescription || "",
                  status: "PENDING",
                  kurir: newCourier
                    ? { connect: { id: newCourier.id } }
                    : data.courierUserId
                      ? { connect: { id: data.courierUserId } }
                      : undefined,
                },
              }
            : undefined,
      },
    });

    // Create Toko record linked to ProfilPenjual with store details + coordinates
    if (peran === "PENJUAL") {
      const profil = await this.prisma.profilPenjual.findUnique({
        where: { penggunaId: newUser.id },
      });
      if (profil) {
        const storeName = data.storeName || nama;
        const storeSlug =
          storeName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "") +
          "-" +
          Math.random().toString(36).substring(2, 8);

        const lat = data.lat || data.storeLat;
        const lng = data.lng || data.storeLng;

        await this.prisma.toko.create({
          data: {
            penjualId: profil.id,
            nama: storeName,
            slug: storeSlug,
            kabupaten: data.storeCity || data.kabupaten || "",
            wilayah: data.storeProvince || data.wilayah || "",
            deskripsi: data.storeDescription || "",
            alamat: data.storeAddress || "",
            telepon: data.storePhone || noTelepon,
            status: "PENDING",
            lat: lat ? Number(lat) : null,
            lng: lng ? Number(lng) : null,
          },
        });
      }
    }

    // Record creation log in activity history
    if (newCourier) {
      await this.activityLog.log({
        penggunaId: adminId,
        kategori: "MANAJEMEN_AKUN",
        aksi: "BUAT_AKUN_KURIR",
        deskripsi: `Admin membuat akun Kurir terafiliasi baru: ${newCourier.nama} (${newCourier.email})`,
        metadata: { courierId: newCourier.id },
      });
    }

    await this.activityLog.log({
      penggunaId: adminId,
      kategori: "MANAJEMEN_AKUN",
      aksi: "BUAT_AKUN_PENJUAL",
      deskripsi: `Admin membuat akun Penjual baru: ${newUser.nama} (${newUser.email})`,
      metadata: { sellerId: newUser.id },
    });

    // Send Welcome & Verification Email for Seller
    await this.emailService.sendAdminCreatedWelcomeEmail(
      email,
      nama,
      peran as string,
      kataSandi,
      noTelepon,
      sellerToken,
    );

    return {
      statusCode: 201,
      message: "Akun penjual dan kurir afiliasi berhasil dibuat",
      data: newUser,
    };
  }
}
