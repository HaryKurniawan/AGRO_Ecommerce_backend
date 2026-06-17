import { Injectable } from "@nestjs/common";

import { TokosRepository } from "../repositories/tokos.repository";

@Injectable()
export class GetNearestStoreUseCase {
  constructor(private readonly storesRepo: TokosRepository) {}

  async execute(lat: number, lng: number) {
    const tokos = await this.storesRepo.findMany({
      where: {
        status: "ACTIVE",
        lat: { not: null },
        lng: { not: null },
      },
      select: {
        id: true,
        nama: true,
        alamat: true,
        lat: true,
        lng: true,
      },
    });

    if (tokos.length === 0) {
      return null;
    }

    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371; // Earth radius in km

    let nearest = tokos[0];
    let minDistance = Infinity;

    for (const toko of tokos) {
      if (toko.lat === null || toko.lng === null) continue;

      const dLat = toRad(toko.lat - lat);
      const dLng = toRad(toko.lng - lng);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat)) *
          Math.cos(toRad(toko.lat)) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      if (distance < minDistance) {
        minDistance = distance;
        nearest = toko;
      }
    }

    return {
      toko: nearest,
      distanceKm: Number(minDistance.toFixed(2)),
    };
  }
}
