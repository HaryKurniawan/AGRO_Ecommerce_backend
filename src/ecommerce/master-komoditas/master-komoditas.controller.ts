import {
  Controller,
  Get,
  Query,
  Param,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";

import { MasterKomoditasService } from "./master-komoditas.service";

@ApiTags("Master Komoditas (Gudang Proxy)")
@Controller("master-komoditas")
export class MasterKomoditasController {
  private readonly logger = new Logger("MasterKomoditasController");

  constructor(private readonly service: MasterKomoditasService) {}

  @Get()
  @ApiOperation({
    summary: "Get all master komoditas from Gudang (read-only)",
    description:
      "Fetch all master komoditas data from Gudang service with optional search and category filters",
  })
  async getAll(
    @Query("search") search?: string,
    @Query("kategori") kategori?: string,
    @Query("isActive") isActive?: string,
  ): Promise<any> {
    try {
      return await this.service.getAllKomoditas({
        search,
        kategori,
        isActive,
      });
    } catch (error) {
      this.logger.error(`Error fetching master komoditas: ${error.message}`);
      throw new HttpException(
        "Gagal mengambil data komoditas dari gudang",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get a single master komoditas by ID from Gudang (read-only)",
    description: "Fetch a specific master komoditas by ID from Gudang service",
  })
  async getById(@Param("id") id: string): Promise<any> {
    try {
      if (!id) {
        throw new HttpException(
          "ID tidak boleh kosong",
          HttpStatus.BAD_REQUEST,
        );
      }

      return await this.service.getKomoditasById(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Error fetching master komoditas by ID: ${error.message}`,
      );
      throw new HttpException(
        "Gagal mengambil data komoditas dari gudang",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
