import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

import { JwtAuthGuard } from "../../core/auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-pengguna.decorator";
import { CreateStoreDto } from "./dto/create-toko.dto";
import { UpdateStoreDto } from "./dto/update-toko.dto";
import { CreateStoreUseCase } from "./use-cases/create-toko.usecase";
import { UpdateStoreUseCase } from "./use-cases/update-toko.usecase";
import { FindAllStoresUseCase } from "./use-cases/find-all-tokos.usecase";
import { FindStoreByIdUseCase } from "./use-cases/find-toko-by-id.usecase";
import { FindStoreBySlugUseCase } from "./use-cases/find-toko-by-slug.usecase";
import { FindMyStoreUseCase } from "./use-cases/find-my-toko.usecase";
import { AdminUpdateStoreStatusUseCase } from "./use-cases/admin-update-toko-status.usecase";
import { GetNearestStoreUseCase } from "./use-cases/get-nearest-toko.usecase";
import { GetTokoStockHistoryUseCase } from "./use-cases/get-toko-stock-history.usecase";

import { UpdateStoreStatusDto } from "./dto/update-store-status.dto";

@ApiTags("Toko")
@Controller("toko")
export class StoresController {
  constructor(
    private readonly createStoreUC: CreateStoreUseCase,
    private readonly updateStoreUC: UpdateStoreUseCase,
    private readonly findAllStoresUC: FindAllStoresUseCase,
    private readonly findStoreByIdUC: FindStoreByIdUseCase,
    private readonly findStoreBySlugUC: FindStoreBySlugUseCase,
    private readonly findMyStoreUC: FindMyStoreUseCase,
    private readonly adminUpdateStatusUC: AdminUpdateStoreStatusUseCase,
    private readonly getNearestStoreUC: GetNearestStoreUseCase,
    private readonly getStockHistoryUC: GetTokoStockHistoryUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: "Get all active toko" })
  async findAll(
    @Query("wilayah") wilayah?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<any> {
    return this.findAllStoresUC.execute({
      wilayah,
      search,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Get("warehouses")
  @ApiOperation({ summary: "Get all active warehouses from Gudang Express" })
  async findAllWarehouses(): Promise<any> {
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
      const data = await response.json();
      if (data && data.data) {
        return data.data;
      }
    } catch (error) {
      console.warn(
        "Gagal memuat gudang dari API terpisah, fallback ke empty array",
        error,
      );
    }
    return [];
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("my-toko")
  @ApiOperation({ summary: "Get current penjual toko" })
  async findMyStore(@CurrentUser("sub") penggunaId: string): Promise<any> {
    return this.findMyStoreUC.execute(penggunaId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("my-toko/stock-history")
  @ApiOperation({ summary: "Get stock history for current penjual toko" })
  async getMyStockHistory(
    @CurrentUser("sub") penggunaId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<any> {
    return this.getStockHistoryUC.execute(
      penggunaId,
      page ? +page : undefined,
      limit ? +limit : undefined,
    );
  }

  @Get("slug/:slug")
  @ApiOperation({ summary: "Get toko by slug" })
  async findBySlug(@Param("slug") slug: string): Promise<any> {
    return this.findStoreBySlugUC.execute(slug);
  }

  @Get("nearest")
  @ApiOperation({
    summary: "Find nearest active toko by coordinates",
  })
  async getNearestStore(
    @Query("lat") lat: string,
    @Query("lng") lng: string,
  ): Promise<any> {
    if (!lat || !lng) {
      return { toko: null, distanceKm: null };
    }
    return this.getNearestStoreUC.execute(parseFloat(lat), parseFloat(lng));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("admin/all")
  @ApiOperation({ summary: "Admin: get all toko" })
  async adminFindAll(
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<any> {
    return this.findAllStoresUC.execute({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get toko by ID" })
  async findOne(@Param("id") id: string): Promise<any> {
    return this.findStoreByIdUC.execute(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: "Create a new toko (penjual)" })
  async create(
    @CurrentUser("sub") penggunaId: string,
    @Body() dto: CreateStoreDto,
  ): Promise<any> {
    return this.createStoreUC.execute(penggunaId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch("admin/:id/status")
  @ApiOperation({ summary: "Admin: update toko status" })
  async adminUpdateStatus(
    @Param("id") id: string,
    @Body() payload: UpdateStoreStatusDto,
  ): Promise<any> {
    return this.adminUpdateStatusUC.execute(id, payload.status);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(":id")
  @ApiOperation({ summary: "Update toko (owner only)" })
  async update(
    @Param("id") id: string,
    @CurrentUser("sub") penggunaId: string,
    @Body() dto: UpdateStoreDto,
  ): Promise<any> {
    return this.updateStoreUC.execute(id, penggunaId, dto);
  }
}
