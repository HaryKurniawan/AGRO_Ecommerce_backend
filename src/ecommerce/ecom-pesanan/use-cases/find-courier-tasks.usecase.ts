import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class FindCourierTasksUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(courierId: string, query: { page?: number; limit?: number }) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      this.prisma.pengirimanPesananEcom.findMany({
        where: {
          kurirPenggunaId: courierId,
        },
        include: {
          pesanan: {
            include: {
              konsumen: {
                include: {
                  addresses: {
                    where: { isDefault: true },
                    take: 1,
                  },
                },
              },
              item: {
                include: {
                  produk: {
                    include: {
                      toko: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      this.prisma.pengirimanPesananEcom.count({
        where: {
          kurirPenggunaId: courierId,
        },
      }),
    ]);

    // Map to a more readable format for the frontend
    const formattedData = tasks.map((t) => {
      const pesanan = (t as any).pesanan;
      const konsumen = pesanan?.konsumen;
      const defaultAddr = konsumen?.addresses?.[0] ?? null;

      return {
        id: t.pesananId,
        status: pesanan?.status,
        totalHarga: pesanan?.totalHarga,
        metodeBayar: pesanan?.metodeBayar,
        createdAt: pesanan?.createdAt,
        tokoId: pesanan?.item?.[0]?.produk?.tokoId,
        tokoNama: pesanan?.item?.[0]?.produk?.toko?.nama,
        customer: {
          id: konsumen?.id,
          name: konsumen?.nama,
          email: konsumen?.email,
          phoneNumber: konsumen?.noTelepon,
          alamatLat: defaultAddr?.lat ?? null,
          alamatLng: defaultAddr?.lng ?? null,
          penerima: defaultAddr?.penerima ?? konsumen?.nama,
          teleponPenerima: defaultAddr?.telepon ?? konsumen?.noTelepon,
        },
        alamatKirim: pesanan?.alamatKirim,
        items: (pesanan?.item ?? []).map((i: any) => ({
          product: {
            nama: i.produk?.nama,
            gambarUrl: i.produk?.gambarUrl,
          },
          jumlah: i.jumlah,
          harga: i.harga,
        })),
        shipping: {
          id: t.id,
          status: t.status,
          kurirName: t.kurirNama,
          kurirPhone: t.kurirTelepon,
          catatan: t.catatan,
          trackingHistory: Array.isArray(t.trackingHistory)
            ? (t.trackingHistory as any[])
            : [],
          buktiKirimFoto: Array.isArray(t.buktiKirimFoto)
            ? (t.buktiKirimFoto as string[])
            : [],
          buktiKirimCatatan: t.buktiKirimCatatan,
          buktiKirimWaktu: t.buktiKirimWaktu,
          buktiKirimLat: t.buktiKirimLat,
          buktiKirimLng: t.buktiKirimLng,
          updatedAt: t.updatedAt,
        },
      };
    });

    return {
      statusCode: 200,
      data: {
        data: formattedData,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }
}
