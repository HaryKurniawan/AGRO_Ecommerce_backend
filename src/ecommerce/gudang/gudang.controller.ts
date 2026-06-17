import {
  Controller,
  Get,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";

/**
 * Proxy controller untuk mengakses data warehouse/gudang dari GUDANG service
 * Semua request di-forward ke GUDANG backend API
 */
@ApiTags("Gudang (Warehouse Proxy)")
@Controller("gudang")
export class GudangController {
  private readonly logger = new Logger(GudangController.name);

  /**
   * Get all active warehouses from GUDANG service
   */
  @Get()
  @ApiOperation({ summary: "Get all active warehouses from GUDANG service" })
  async getAllWarehouses(): Promise<any> {
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

      if (!response.ok) {
        throw new Error(`GUDANG API responded with ${response.status}`);
      }

      const json = await response.json();
      // Unwrap GUDANG response { statusCode, message, data } → return data directly
      return json?.data ?? json;
    } catch (error: any) {
      this.logger.error(
        "Error fetching warehouses from GUDANG service:",
        error.message,
      );
      throw new HttpException(
        "Gagal mengambil data gudang dari GUDANG service",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get warehouse products (katalog) from GUDANG service.
   * Jika gudangId diberikan, ambil produk untuk gudang tsb; jika tidak,
   * agregasikan produk dari seluruh gudang aktif.
   */
  @Get("produk")
  @ApiOperation({
    summary: "Get warehouse product catalog from GUDANG service",
  })
  async getProdukGudang(@Query("gudangId") gudangId?: string): Promise<any> {
    const baseUrl = process.env.GUDANG_API_URL
      ? `${process.env.GUDANG_API_URL}/api`
      : "http://localhost:5005/api";
    const apiKey =
      process.env.ECOMMERCE_API_KEY ||
      "ecommerce-nestjs-to-gudang-express-secure-key";
    const headers = { "x-api-key": apiKey };

    const fetchKatalog = async (gid: string) => {
      try {
        const res = await fetch(`${baseUrl}/produk/katalog?gudangId=${gid}`, {
          headers,
        });
        if (!res.ok) return [];
        const json = await res.json();
        const data = json?.data ?? {};
        const products = data.products ?? [];
        const gudang = data.gudang ?? null;
        // Sisipkan info gudang ke tiap produk untuk ditampilkan di tabel
        return products.map((p: any) => ({
          ...p,
          gudangId: gudang?.id ?? gid,
          gudangNama: gudang?.nama ?? null,
          gudangKode: gudang?.kode ?? null,
        }));
      } catch {
        return [];
      }
    };

    try {
      // Jika gudangId spesifik diberikan
      if (gudangId) {
        return await fetchKatalog(gudangId);
      }

      // Ambil semua gudang aktif lalu agregasi katalognya
      const whRes = await fetch(`${baseUrl}/gudang`, { headers });
      if (!whRes.ok) {
        throw new Error(`GUDANG API responded with ${whRes.status}`);
      }
      const whJson = await whRes.json();
      const warehouses: any[] = whJson?.data ?? [];

      const all = await Promise.all(warehouses.map((w) => fetchKatalog(w.id)));
      return all.flat();
    } catch (error: any) {
      this.logger.error(
        "Error fetching warehouse products from GUDANG service:",
        error.message,
      );
      throw new HttpException(
        "Gagal mengambil daftar produk gudang dari GUDANG service",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get warehouse detail by ID from GUDANG service
   */
  @Get(":id")
  @ApiOperation({ summary: "Get warehouse detail by ID from GUDANG service" })
  async getWarehouseDetail(@Param("id") id: string): Promise<any> {
    try {
      const triggerUrl = process.env.GUDANG_API_URL
        ? `${process.env.GUDANG_API_URL}/api/gudang/${id}`
        : `http://localhost:5005/api/gudang/${id}`;

      const response = await fetch(triggerUrl, {
        headers: {
          "x-api-key":
            process.env.ECOMMERCE_API_KEY ||
            "ecommerce-nestjs-to-gudang-express-secure-key",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new HttpException(
            "Gudang tidak ditemukan",
            HttpStatus.NOT_FOUND,
          );
        }
        throw new Error(`GUDANG API responded with ${response.status}`);
      }

      const json = await response.json();
      // Unwrap GUDANG response { statusCode, message, data } → return data directly
      return json?.data ?? json;
    } catch (error: any) {
      this.logger.error(
        `Error fetching warehouse ${id} from GUDANG service:`,
        error.message,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        "Gagal mengambil detail gudang dari GUDANG service",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
