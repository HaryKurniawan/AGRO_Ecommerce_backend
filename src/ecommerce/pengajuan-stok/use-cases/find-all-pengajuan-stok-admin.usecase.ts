import { Injectable } from "@nestjs/common";

import { PengajuanStokRepository } from "../repositories/pengajuan-stok.repository";

@Injectable()
export class FindAllPengajuanStokAdminUseCase {
  constructor(private readonly stokRepo: PengajuanStokRepository) {}

  async execute() {
    // Fetch all warehouses to map them
    let warehouses: any[] = [];
    try {
      const triggerUrl = process.env.GUDANG_API_URL
        ? `${process.env.GUDANG_API_URL}/api/gudang`
        : "http://localhost:5005/api/gudang";

      const response = await fetch(triggerUrl, {
        headers: {
          "x-api-key":
            process.env.ECOMMERCE_API_KEY ||
            "ecommerce-nestjs-to-gudang-express-secure-key",
        },
      });
      const resData = await response.json();
      if (resData && resData.data) {
        warehouses = resData.data;
      }
    } catch (e) {
      console.warn(
        "Gagal memuat list gudang untuk mapping admin pengajuan stok",
        e,
      );
    }

    const requests = await this.stokRepo.findMany({
      include: {
        toko: {
          select: {
            id: true,
            nama: true,
            slug: true,
          },
        },
        items: true, // ✅ Remove produk include since it no longer exists
      },
      orderBy: { createdAt: "desc" },
    });

    // Helper: ambil detail satu gudang dari GUDANG service (untuk gudang non-ACTIVE
    // atau yang tidak muncul di list)
    const fetchWarehouseById = async (
      gudangId: string,
    ): Promise<any | null> => {
      try {
        const baseUrl = process.env.GUDANG_API_URL
          ? `${process.env.GUDANG_API_URL}/api/gudang`
          : "http://localhost:5005/api/gudang";

        const response = await fetch(`${baseUrl}/${gudangId}`, {
          headers: {
            "x-api-key":
              process.env.ECOMMERCE_API_KEY ||
              "ecommerce-nestjs-to-gudang-express-secure-key",
          },
        });
        if (!response.ok) return null;
        const resData = await response.json();
        return resData?.data ?? null;
      } catch {
        return null;
      }
    };

    // Cache untuk gudang yang di-fetch per-ID agar tidak duplikat request
    const warehouseCache = new Map<string, any>();

    // Merge warehouse info into requests
    const result = await Promise.all(
      requests.map(async (req) => {
        let warehouse =
          warehouses.find((w: any) => w.id === req.gudangId) || null;

        // Fallback: jika tidak ada di list ACTIVE, ambil detail per-ID
        if (!warehouse) {
          if (warehouseCache.has(req.gudangId)) {
            warehouse = warehouseCache.get(req.gudangId);
          } else {
            warehouse = await fetchWarehouseById(req.gudangId);
            warehouseCache.set(req.gudangId, warehouse);
          }
        }

        return {
          ...req,
          gudang: warehouse
            ? {
                id: warehouse.id,
                kode: warehouse.kode,
                nama: warehouse.nama,
                alamat: warehouse.alamat,
                telepon: warehouse.telepon,
              }
            : {
                id: req.gudangId,
                nama: "Gudang tidak diketahui",
              },
        };
      }),
    );

    return result;
  }
}
