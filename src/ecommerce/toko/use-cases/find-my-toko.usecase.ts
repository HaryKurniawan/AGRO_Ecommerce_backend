import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { TokosRepository } from "../repositories/tokos.repository";

@Injectable()
export class FindMyStoreUseCase {
  constructor(
    private readonly storesRepo: TokosRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(penggunaId: string) {
    const pengguna = await this.storesRepo.findUserById(penggunaId);
    if (!pengguna) throw new NotFoundException("Pengguna not found");

    let toko = null;

    if (pengguna.peran === "KURIR") {
      // Find toko where this user is assigned as courier
      toko = await this.storesRepo.findFirst({
        where: {
          OR: [
            { courierStaffId: penggunaId },
            { kurirStaffs: { some: { id_pengguna: penggunaId } } },
            { penjual: { kurirId: penggunaId } }
          ]
        } as any,
        include: {
          kurirStaffs: true,
          penjual: { include: { kurir: true, pengguna: true } }
        } as any,
      });
    } else {
      // Find toko by seller profile (default logic)
      const profilPenjual =
        await this.storesRepo.findSellerProfileByUserId(penggunaId);
      if (!profilPenjual)
        throw new NotFoundException("Seller profile not found");

      toko = await this.storesRepo.findUnique({
        where: { penjualId: profilPenjual.id_profilPenjual },
        include: {
          produk: { orderBy: { createdAt: "desc" }, take: 20 },
          kurirStaffs: true,
          penjual: { include: { kurir: true, pengguna: true } },
        } as any,
      });
    }

    if (!toko) {
      throw new NotFoundException(
        "Toko not found or you are not assigned to any store.",
      );
    }

    const rawCourier = 
      (toko as any).penjual?.kurir ||
      (toko as any).kurirStaffs?.find((c: any) => c.id === toko.courierStaffId) ||
      (toko as any).kurirStaffs?.[0] ||
      null;

    const courierStaff = rawCourier ? {
      ...rawCourier,
      name: rawCourier.nama,
      phoneNumber: rawCourier.noTelepon,
    } : null;

    return {
      ...toko,
      id: toko.id_toko,
      courierStaff,
    };
  }
}
