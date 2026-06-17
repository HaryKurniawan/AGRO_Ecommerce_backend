import { Injectable, Logger } from "@nestjs/common";

export interface GeocodingResult {
  kota: string | null;
  kabupaten: string | null;
  provinsi: string | null;
  raw: any;
}

@Injectable()
export class OsmGeocodingService {
  private readonly logger = new Logger(OsmGeocodingService.name);

  /**
   * Mengambil data kota/kabupaten dari koordinat latitude dan longitude
   * menggunakan API Publik Nominatim OpenStreetMap.
   *
   * API ini memiliki limitasi ketat (1 request per detik), gunakan dengan bijak.
   */
  async reverseGeocode(lat: number, lng: number): Promise<GeocodingResult> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

      const response = await fetch(url, {
        headers: {
          "User-Agent": "AgroJabar-Ecommerce-Backend/1.0",
          "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
        },
        // Timeout 5 detik
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        this.logger.warn(`Nominatim API failed with status ${response.status}`);
        return this.createEmptyResult();
      }

      const data = await response.json();

      if (!data || !data.address) {
        return this.createEmptyResult(data);
      }

      const address = data.address;

      // Nominatim bisa mengembalikan 'city', 'town', 'municipality', atau 'county'
      let kota = address.city || address.town || address.municipality || null;
      const kabupaten = address.county || null;
      const provinsi = address.state || address.province || null;

      // Normalisasi: Seringkali 'county' berawalan "Kabupaten "
      if (kabupaten && kabupaten.toLowerCase().startsWith("kabupaten ")) {
        // Kita bisa biarkan atau bersihkan. Untuk kemudahan pencocokan, biarkan aslinya.
      }

      // Jika kota tidak ada tapi kabupaten ada, jadikan kota = kabupaten (untuk kemudahan matching)
      if (!kota && kabupaten) {
        kota = kabupaten;
      }

      return {
        kota,
        kabupaten,
        provinsi,
        raw: data,
      };
    } catch (error) {
      this.logger.error(`Error in reverseGeocode: ${error.message}`);
      return this.createEmptyResult();
    }
  }

  private createEmptyResult(raw: any = null): GeocodingResult {
    return {
      kota: null,
      kabupaten: null,
      provinsi: null,
      raw,
    };
  }
}
