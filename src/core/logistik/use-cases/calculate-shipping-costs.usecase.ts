/**
 * Use Case: Calculate Shipping Costs
 *
 * Satu metode pengiriman: Kurir Reguler (Lokal).
 * Aturan ongkir:
 *   1. Cek area cakupan kota → di luar area = BLOKIR
 *   2. Hitung jarak Haversine (garis lurus) dari toko ke alamat pembeli:
 *      - ≤ 5 km → Gratis ongkir (Haversine selalu < jarak jalan, jadi ini generous)
 *      - > 5 km → Flat Rp 15.000
 *
 * Kenapa Haversine, bukan OSRM?
 *   - OSRM public server sering timeout & rate-limited → checkout jadi lambat
 *   - Haversine instan (< 1ms) dan 100% reliable
 *   - Untuk threshold 5km, Haversine cukup akurat (jarak jalan ≈ Haversine × 1.2–1.4)
 *   - Jadi Haversine 5km ≈ jarak jalan 6–7km → sedikit benefit ke konsumen = OK
 */

import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { LogisticsRepository } from "../logistics.repository";
import { calculateHaversineDistance } from "../../../common/utils/haversine-distance.util";

export interface CalculateShippingDto {
  customerAddressId: string;
  toko: {
    tokoId: string;
    totalWeightGram: number;
  }[];
}

export interface ShippingResult {
  tokoId: string;
  namaToko: string;
  distanceKm: number;
  totalWeightKg: number;
  isFallback: boolean;
  ongkir: number;
  isAvailable: boolean;
  keterangan: string;
}

@Injectable()
export class CalculateShippingCostsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logisticsRepo: LogisticsRepository,
  ) {}

  async execute(dto: CalculateShippingDto): Promise<ShippingResult[]> {
    // Get customer address
    const alamat = await this.prisma.alamatKonsumen.findUnique({
      where: { id: dto.customerAddressId },
    });

    if (!alamat) {
      throw new NotFoundException("Alamat pengiriman tidak ditemukan");
    }

    // Get shipping config
    let config = await this.logisticsRepo.findFirstShippingConfig();
    if (!config) {
      config = await this.logisticsRepo.createShippingConfig({
        data: {
          gratisBawahKm: 5.0,
          ongkirFlat: 15000,
        },
      });
    }

    const ongkirFlat = (config as any).ongkirFlat ?? 15000;
    const gratisBawahKm = (config as any).gratisBawahKm ?? 5.0;
    const buyerCity = (alamat.kota || alamat.provinsi || "")
      .toLowerCase()
      .trim();

    // Process all stores in parallel
    const storePromises = dto.toko.map(async (storeReq) => {
      try {
        const toko = await this.logisticsRepo.findTokoById(storeReq.tokoId);
        if (!toko) {
          return {
            tokoId: storeReq.tokoId,
            namaToko: "Unknown Store",
            distanceKm: 0,
            totalWeightKg: 0,
            isFallback: false,
            ongkir: 0,
            isAvailable: false,
            keterangan: `Toko tidak ditemukan`,
          };
        }

        const beratKg = storeReq.totalWeightGram / 1000;

        // Area coverage check
        const allowedAreas =
          toko.areaCakupanKota && toko.areaCakupanKota.length > 0
            ? toko.areaCakupanKota.map((a: string) => a.toLowerCase().trim())
            : [toko.kabupaten.toLowerCase().trim()];

        const isAllowedArea =
          !buyerCity ||
          allowedAreas.length === 0 ||
          allowedAreas.some((area: string) => {
            return (
              buyerCity.includes(area) ||
              area.includes(buyerCity) ||
              buyerCity === area
            );
          });

        if (!isAllowedArea) {
          return {
            tokoId: toko.id,
            namaToko: toko.nama,
            distanceKm: 0,
            totalWeightKg: beratKg,
            isFallback: false,
            ongkir: 0,
            isAvailable: false,
            keterangan: "Di luar area jangkauan pengiriman",
          };
        }

        // Calculate Haversine distance (instant, no external API call)
        let distanceKm = 0;
        const hasCoords = toko.lat && toko.lng && alamat.lat && alamat.lng;

        if (hasCoords) {
          distanceKm = calculateHaversineDistance(
            toko.lat!,
            toko.lng!,
            alamat.lat!,
            alamat.lng!,
          );
        }

        // Determine ongkir: free if ≤ gratisBawahKm, flat rate otherwise
        const isFreeShipping = hasCoords && distanceKm <= gratisBawahKm;
        const ongkir = isFreeShipping ? 0 : ongkirFlat;

        const keterangan = !hasCoords
          ? `Ongkir flat Rp ${ongkirFlat.toLocaleString("id-ID")} (koordinat belum tersedia)`
          : isFreeShipping
            ? `Gratis ongkir (jarak ${distanceKm.toFixed(1)} km)`
            : `Ongkir Rp ${ongkirFlat.toLocaleString("id-ID")} (jarak ${distanceKm.toFixed(1)} km)`;



        return {
          tokoId: toko.id,
          namaToko: toko.nama,
          distanceKm: parseFloat(distanceKm.toFixed(2)),
          totalWeightKg: beratKg,
          isFallback: false,
          ongkir,
          isAvailable: true,
          keterangan,
        };
      } catch (error) {
        return {
          tokoId: storeReq.tokoId,
          namaToko: "Error",
          distanceKm: 0,
          totalWeightKg: 0,
          isFallback: false,
          ongkir: 0,
          isAvailable: false,
          keterangan: `Error: ${error.message || "Gagal menghitung ongkir"}`,
        };
      }
    });

    const results = await Promise.all(storePromises);
    return results;
  }
}
