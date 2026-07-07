import {
  Controller,
  Post,
  Get,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { StatusPengajuanStok } from "@prisma/client";

import { JwtAuthGuard } from "../../core/auth/guards/jwt-auth.guard";
import { CreatePengajuanStokUseCase } from "./use-cases/create-pengajuan-stok.usecase";
import { UpdatePengajuanStokStatusUseCase } from "./use-cases/update-pengajuan-stok-status.usecase";
import { FindProdukForPengajuanUseCase } from "./use-cases/find-produk-for-pengajuan.usecase";
import { FindMyPengajuanStokUseCase } from "./use-cases/find-my-pengajuan-stok.usecase";
import { FindPengajuanStokByIdUseCase } from "./use-cases/find-pengajuan-stok-by-id.usecase";
import { FindAllPengajuanStokAdminUseCase } from "./use-cases/find-all-pengajuan-stok-admin.usecase";
import { FindProductHistoryUseCase } from "./use-cases/find-product-history.usecase";
import { ProductHistoryItem } from "./dto/product-history.dto";

@ApiTags("Ecommerce - Pengajuan Stok")
@Controller("ecommerce/pengajuan-stok")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PengajuanStokController {
  constructor(
    private readonly createUseCase: CreatePengajuanStokUseCase,
    private readonly updateStatusUseCase: UpdatePengajuanStokStatusUseCase,
    private readonly findProdukUseCase: FindProdukForPengajuanUseCase,
    private readonly findMyRequestsUseCase: FindMyPengajuanStokUseCase,
    private readonly findByIdUseCase: FindPengajuanStokByIdUseCase,
    private readonly findAllAdminUseCase: FindAllPengajuanStokAdminUseCase,
    private readonly findProductHistoryUseCase: FindProductHistoryUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: "Seller: Buat pengajuan stok baru ke gudang" })
  async create(
    @Request() req,
    @Body()
    data: {
      gudangId: string;
      catatan?: string;
      modePengemasan?: "DEFAULT" | "CUSTOM";
      items: {
        produkGudangId: string;
        jumlahPermintaan: number;
        ukuranKemasanKg?: number;
        jumlahKemasan?: number;
        totalKg?: number;
        kemasanDetail?: { ukuranKg: number; jumlahKemasan: number }[];
      }[];
    },
  ) {
    return this.createUseCase.execute(req.user.id, data);
  }

  @Get("products")
  @ApiOperation({
    summary: "Seller: Ambil daftar produk gudang untuk diajukan pengadaan",
  })
  async getProducts(
    @Request() req,
    @Query("gudangId") gudangId: string,
    @Query("all") all?: string,
  ) {
    if (!gudangId) {
      return {
        statusCode: 400,
        message: "gudangId wajib dicantumkan",
      };
    }

    const products = await this.findProdukUseCase.execute(
      req.user.id,
      gudangId,
      all === "true" || all === "1",
    );
    return {
      statusCode: 200,
      message: "Berhasil mengambil daftar produk gudang",
      data: {
        products,
        total: products.length,
      },
    };
  }

  @Get("admin/all")
  @ApiOperation({
    summary: "Admin: Ambil seluruh daftar pengajuan stok",
  })
  async getAllAdmin() {
    return this.findAllAdminUseCase.execute();
  }

  @Get("history/products")
  @ApiOperation({
    summary: "Seller: Ambil riwayat produk yang pernah diajukan",
  })
  async getProductHistory(@Request() req): Promise<{
    statusCode: number;
    message: string;
    data: ProductHistoryItem[];
  }> {
    try {
      console.log(
        `[PengajuanStokController] getProductHistory called for user ${req.user.id}`,
      );
      const history = await this.findProductHistoryUseCase.execute(req.user.id);
      console.log(
        `[PengajuanStokController] getProductHistory returning ${history.length} items`,
      );
      return {
        statusCode: 200,
        message: "Berhasil mengambil riwayat produk",
        data: history,
      };
    } catch (error) {
      console.error(
        "[PengajuanStokController] getProductHistory error:",
        error,
      );
      throw error;
    }
  }

  @Get(":id")
  @ApiOperation({
    summary: "Seller/Admin: Detail pengajuan stok berdasarkan ID",
  })
  async getById(@Param("id") id: string) {
    return this.findByIdUseCase.execute(id);
  }

  @Get()
  @ApiOperation({
    summary: "Seller: Ambil daftar pengajuan stok milik sendiri",
  })
  async getMyRequests(@Request() req) {
    return this.findMyRequestsUseCase.execute(req.user.id);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Admin/Gudang: Update status pengajuan stok" })
  async updateStatus(
    @Request() req,
    @Param("id") id: string,
    @Body()
    data: {
      status: StatusPengajuanStok;
      catatan?: string;
      itemUpdates?: {
        itemId: string;
        jumlahDisetujui: number;
      }[];
    },
  ) {
    return this.updateStatusUseCase.execute(req.user.id, id, data);
  }
}

@ApiTags("Ecommerce - Pengajuan Stok Webhook (Gudang)")
@Controller("ecommerce/pengajuan-stok/webhook")
export class PengajuanStokWebhookController {
  constructor(
    private readonly updateStatusUseCase: UpdatePengajuanStokStatusUseCase,
  ) {}

  @Patch(":id/status")
  @ApiOperation({ summary: "Gudang Service: Update status pengajuan stok" })
  async webhookUpdateStatus(
    @Param("id") id: string,
    @Body()
    data: {
      status: StatusPengajuanStok;
      catatan?: string;
      itemUpdates?: {
        itemId: string;
        jumlahDisetujui: number;
      }[];
    },
  ) {
    return this.updateStatusUseCase.execute("system-gudang-service", id, data);
  }
}
