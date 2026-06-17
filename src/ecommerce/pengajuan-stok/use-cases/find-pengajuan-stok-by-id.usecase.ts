import { Injectable, NotFoundException } from "@nestjs/common";

import { PengajuanStokRepository } from "../repositories/pengajuan-stok.repository";

@Injectable()
export class FindPengajuanStokByIdUseCase {
  constructor(private readonly stokRepo: PengajuanStokRepository) {}

  async execute(id: string) {
    const request = await this.stokRepo.findUnique({
      where: { id },
      include: {
        items: true, // ✅ Remove produk include
        toko: true,
      },
    });

    if (!request) {
      throw new NotFoundException("Pengajuan stok tidak ditemukan");
    }

    // Ambil detail gudang dari GUDANG service untuk ditampilkan di nota
    let gudang: any = { id: request.gudangId, nama: "Gudang tidak diketahui" };
    try {
      const baseUrl = process.env.GUDANG_API_URL
        ? `${process.env.GUDANG_API_URL}/api/gudang`
        : "http://localhost:5005/api/gudang";

      const response = await fetch(`${baseUrl}/${request.gudangId}`, {
        headers: {
          "x-api-key":
            process.env.ECOMMERCE_API_KEY ||
            "ecommerce-nestjs-to-gudang-express-secure-key",
        },
      });
      if (response.ok) {
        const resData = await response.json();
        const w = resData?.data;
        if (w) {
          gudang = {
            id: w.id,
            kode: w.kode,
            nama: w.nama,
            alamat: w.alamat,
            kabupaten: w.kabupaten,
            provinsi: w.provinsi,
            telepon: w.telepon,
            email: w.email,
          };
        }
      }
    } catch {
      // Biarkan fallback gudang default
    }

    return { ...request, gudang };
  }
}
