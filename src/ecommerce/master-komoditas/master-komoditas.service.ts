import { Injectable, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { type AxiosInstance } from "axios";

@Injectable()
export class MasterKomoditasService {
  private readonly logger = new Logger("MasterKomoditasService");
  private gudangClient: AxiosInstance;

  constructor(private configService: ConfigService) {
    const gudangUrl = this.configService.get<string>("GUDANG_API_URL");

    if (!gudangUrl) {
      throw new Error("GUDANG_API_URL is not configured");
    }

    // baseURL = http://localhost:5005
    // endpoint gudang: GET /api/master-komoditas/public/all
    this.gudangClient = axios.create({
      baseURL: gudangUrl,
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
      validateStatus: () => true, // tangani semua status secara manual
    });
  }

  async getAllKomoditas(params: {
    search?: string;
    kategori?: string;
    isActive?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append("search", params.search);
    if (params.kategori) queryParams.append("kategori", params.kategori);
    if (params.isActive) queryParams.append("isActive", params.isActive);

    // /api/master-komoditas/public/all → tanpa auth, return semua + _count
    const url = `/api/master-komoditas/public/all${queryParams.toString() ? "?" + queryParams.toString() : ""}`;

    this.logger.debug(`[MasterKomoditas] GET ${url}`);

    let response: any;
    try {
      response = await this.gudangClient.get(url);
    } catch (err: any) {
      this.logger.error(`[MasterKomoditas] Network error: ${err.message}`);
      this.throwNetworkError(err);
    }

    this.logger.debug(`[MasterKomoditas] Gudang responded ${response.status}`);

    if (response.status === 404) {
      return { statusCode: 200, message: "OK", data: [] };
    }

    if (response.status >= 400) {
      throw new HttpException(
        response.data?.message || "Gagal mengambil data komoditas dari gudang",
        response.status,
      );
    }

    return {
      statusCode: 200,
      message: response.data?.message || "OK",
      data: response.data?.data ?? response.data ?? [],
    };
  }

  async getKomoditasById(id: string): Promise<any> {
    if (!id) {
      throw new HttpException("ID tidak boleh kosong", HttpStatus.BAD_REQUEST);
    }

    // Ambil semua lalu filter di sini karena endpoint public/all sudah ada _count
    const url = `/api/master-komoditas/public/all`;
    this.logger.debug(`[MasterKomoditas] GET ${url} (filter id=${id})`);

    let response: any;
    try {
      response = await this.gudangClient.get(url);
    } catch (err: any) {
      this.logger.error(`[MasterKomoditas] Network error: ${err.message}`);
      this.throwNetworkError(err);
    }

    if (response.status >= 400) {
      throw new HttpException(
        response.data?.message || "Gagal mengambil data komoditas",
        response.status,
      );
    }

    const list: any[] = response.data?.data ?? response.data ?? [];
    const item = list.find((k: any) => k.id === id);

    if (!item) {
      throw new HttpException(
        "Komoditas tidak ditemukan",
        HttpStatus.NOT_FOUND,
      );
    }

    return { statusCode: 200, message: "OK", data: item };
  }

  // ─── helper ────────────────────────────────────────────────────────────────
  private throwNetworkError(err: any): never {
    if (err.code === "ECONNREFUSED") {
      throw new HttpException(
        "Gudang service tidak dapat dihubungi (pastikan berjalan di port 5005)",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    if (err.code === "ETIMEDOUT") {
      throw new HttpException(
        "Gudang service timeout",
        HttpStatus.GATEWAY_TIMEOUT,
      );
    }
    throw new HttpException(
      "Gagal terhubung ke Gudang service",
      HttpStatus.BAD_GATEWAY,
    );
  }
}
