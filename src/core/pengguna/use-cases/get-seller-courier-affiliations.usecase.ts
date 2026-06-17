import { Injectable } from "@nestjs/common";
import { PenggunasRepository } from "../repositories/pengguna.repository";

@Injectable()
export class GetSellerCourierAffiliationsUseCase {
  constructor(private readonly usersRepo: PenggunasRepository) {}

  async execute() {
    const sellers = await this.usersRepo.findMany({
      where: {
        peran: "PENJUAL",
      },
      include: {
        profilPenjual: {
          include: {
            toko: {
              include: {
                kurirStaffs: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formatted = sellers.map((s: any) => {
      const store = s.profilPenjual?.toko;
      const kurirStaffs = store?.kurirStaffs || [];
      const primaryCourier = kurirStaffs[0] || null;

      return {
        id: s.id,
        name: s.nama,
        email: s.email,
        peran: s.peran,
        sellerProfile: s.profilPenjual
          ? {
              id: s.profilPenjual.id,
              storeName: s.profilPenjual.namaToko,
              status: s.profilPenjual.status,
              store: store
                ? {
                    id: store.id,
                    nama: store.nama,
                    kabupaten: store.kabupaten,
                    wilayah: store.wilayah,
                    status: store.status,
                    courierStaffId:
                      store.courierStaffId ||
                      (primaryCourier ? primaryCourier.id : null),
                    courierStaff: primaryCourier
                      ? {
                          id: primaryCourier.id,
                          name: primaryCourier.nama,
                          email: primaryCourier.email,
                        }
                      : null,
                    kurirStaffs: kurirStaffs.map((k) => ({
                      id: k.id,
                      name: k.nama,
                      email: k.email,
                      noTelepon: k.noTelepon,
                    })),
                  }
                : null,
            }
          : null,
      };
    });

    return {
      statusCode: 200,
      message: "Data afiliasi penjual dan kurir berhasil diambil",
      data: formatted,
    };
  }
}
