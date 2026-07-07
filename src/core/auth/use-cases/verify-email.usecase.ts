import { Injectable, BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { EmailService } from "../../../common/services/email.service";


@Injectable()
export class VerifyEmailUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async execute(token: string) {
    const pengguna = await this.prisma.pengguna.findFirst({
      where: {
        tokenVerifikasiEmail: token,
        kadaluarsaTokenEmail: {
          gt: new Date(),
        },
      },
      include: { profilPenjual: { include: { toko: true } } },
    });

    if (!pengguna) {
      throw new BadRequestException("Token verifikasi tidak valid atau sudah kadaluarsa. Silakan daftar ulang atau minta kirim ulang.");
    }

    if (pengguna.emailTerverifikasiPada) {
      throw new BadRequestException("Email sudah diverifikasi sebelumnya");
    }

    // Update pengguna: tandai sudah terverifikasi
    await this.prisma.pengguna.update({
      where: { id: pengguna.id },
      data: {
        emailTerverifikasiPada: new Date(),
        // Set legacy fields to null just in case
        tokenVerifikasiEmail: null,
        kadaluarsaTokenEmail: null,
      },
    });



    // Jika seller, otomatis aktifkan profil penjual
    if (pengguna.peran === "PENJUAL" && pengguna.profilPenjual) {
      try {
        await this.prisma.profilPenjual.update({
          where: { penggunaId: pengguna.id },
          data: {
            status: "DISETUJUI",
            terverifikasiPada: new Date(),
          },
        });

        // Update status toko juga jika ada
        if (pengguna.profilPenjual.toko) {
          await this.prisma.toko.update({
            where: { id: pengguna.profilPenjual.toko.id },
            data: { status: "ACTIVE" },
          });
        }

        // Kirim email selamat dengan info login
        const frontendUrl =
          this.configService.get<string>("FRONTEND_OPERASIONAL_URL") || "";
        const loginUrl = `${frontendUrl}/login`;
        const namaToko = pengguna.profilPenjual.namaToko;
        const alamatToko = pengguna.profilPenjual.alamat;
        const kotaToko = pengguna.profilPenjual.kota;
        const provinsiToko = pengguna.profilPenjual.provinsi;

        // Fire and forget so we don't block the HTTP response
        this.emailService.sendSellerActivatedEmail(
          pengguna.email,
          pengguna.nama || pengguna.email,
          namaToko,
          `${alamatToko}, ${kotaToko}, ${provinsiToko}`,
          loginUrl,
        );
      } catch (err) {
        // Jangan gagalkan verifikasi email kalau aktivasi seller error
        console.error("Error activating seller profile:", err);
      }
    }

    // Buat accessToken agar pengguna langsung bisa login
    const accessToken = this.jwtService.sign({
      sub: pengguna.id,
      email: pengguna.email,
      peran: pengguna.peran,
    });

    return {
      message: "Email berhasil diverifikasi!",
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
