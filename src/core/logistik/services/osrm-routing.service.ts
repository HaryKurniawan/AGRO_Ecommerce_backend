import { Injectable, Logger } from "@nestjs/common";
import { calculateHaversineDistance } from "../../../common/utils/haversine-distance.util";

export interface RoutingResult {
  distanceKm: number;
  isFallback: boolean;
  message?: string;
}

@Injectable()
export class OsrmRoutingService {
  private readonly logger = new Logger(OsrmRoutingService.name);
  private readonly OSRM_API_URL =
    "http://router.project-osrm.org/route/v1/driving";

  /**
   * Menghitung jarak jalan raya antara dua titik koordinat menggunakan OSRM.
   * Jika server OSRM gagal atau timeout, otomatis fallback ke Haversine * 1.2
   *
   * @param startLat Latitude asal
   * @param startLng Longitude asal
   * @param endLat Latitude tujuan
   * @param endLng Longitude tujuan
   */
  async getRoadDistance(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
  ): Promise<RoutingResult> {
    const haversineKm = calculateHaversineDistance(
      endLat,
      endLng,
      startLat,
      startLng,
    );

    try {
      // OSRM format: {lng},{lat};{lng},{lat}
      const url = `${this.OSRM_API_URL}/${startLng},${startLat};${endLng},${endLat}?overview=false`;

      const response = await fetch(url, {
        headers: {
          "User-Agent": "AgroJabar-Ecommerce-Backend/1.0",
        },
        signal: AbortSignal.timeout(5000), // Timeout 5 detik
      });

      if (!response.ok) {
        this.logger.warn(`OSRM API failed with status ${response.status}`);
        return this.createFallbackResult(
          haversineKm,
          `OSRM API Error: ${response.status}`,
        );
      }

      const data = await response.json();

      if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
        this.logger.warn(`OSRM returned no routes or bad code: ${data.code}`);
        return this.createFallbackResult(haversineKm, "No route found");
      }

      // OSRM mengembalikan distance dalam satuan meter
      const distanceMeters = data.routes[0].distance;
      const distanceKm = distanceMeters / 1000;

      return {
        distanceKm: parseFloat(distanceKm.toFixed(2)),
        isFallback: false,
      };
    } catch (error) {
      this.logger.error(`Error calculating OSRM distance: ${error.message}`);
      return this.createFallbackResult(haversineKm, error.message);
    }
  }

  /**
   * Menghitung jarak fallback menggunakan Haversine dengan penalty multiplier 1.2
   * karena jarak jalan raya selalu lebih jauh dari garis lurus.
   */
  private createFallbackResult(
    haversineKm: number,
    reason: string,
  ): RoutingResult {
    const fallbackKm = haversineKm * 1.2;
    return {
      distanceKm: parseFloat(fallbackKm.toFixed(2)),
      isFallback: true,
      message: `Fallback to Haversine * 1.2. Reason: ${reason}`,
    };
  }
}
