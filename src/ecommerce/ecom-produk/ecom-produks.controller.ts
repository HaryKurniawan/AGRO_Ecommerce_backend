import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

import { SkipTransform } from "../../common/decorators/skip-transform.decorator";
import { JwtAuthGuard } from "../../core/auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-pengguna.decorator";
import { FindAllProductsUseCase } from "./use-cases/find-all-produks.usecase";
import { FindProductByIdUseCase } from "./use-cases/find-produk-by-id.usecase";
import { CreateProductUseCase } from "./use-cases/create-produk.usecase";
import { UpdateProductUseCase } from "./use-cases/update-produk.usecase";
import { UpdateProductStatusUseCase } from "./use-cases/update-produk-status.usecase";
import { UpdateStockUseCase } from "./use-cases/update-stock.usecase";
import { DeleteProductUseCase } from "./use-cases/delete-produk.usecase";
import { FindProductsByStoreUseCase } from "./use-cases/find-produks-by-toko.usecase";
import { GetStockHistoryUseCase } from "./use-cases/get-stock-history.usecase";
import { GenerateStockReportUseCase } from "./use-cases/generate-stock-report.usecase";
import { UpdateProductPhotosUseCase } from "./use-cases/update-product-photos.usecase";
import { ProdukEcomsRepository } from "./repositories/ecom-produks.repository";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { UpdateProductStatusDto } from "./dto/update-product-status.dto";
import { UpdateProductStockDto } from "./dto/update-product-stock.dto";
import { UpdateProductPhotosDto } from "./dto/update-product-photos.dto";

@ApiTags("Ecom Produk")
@Controller("ecom-produk")
export class EcomProductsController {
  constructor(
    private readonly findAllUC: FindAllProductsUseCase,
    private readonly findOneUC: FindProductByIdUseCase,
    private readonly createUC: CreateProductUseCase,
    private readonly updateUC: UpdateProductUseCase,
    private readonly updateStatusUC: UpdateProductStatusUseCase,
    private readonly updateStockUC: UpdateStockUseCase,
    private readonly removeUC: DeleteProductUseCase,
    private readonly findByStoreUC: FindProductsByStoreUseCase,
    private readonly getStockHistoryUC: GetStockHistoryUseCase,
    private readonly generateStockReportUC: GenerateStockReportUseCase,
    private readonly updatePhotosUC: UpdateProductPhotosUseCase,
    private readonly productsRepo: ProdukEcomsRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: "Get all produk with filters" })
  async findAll(
    @Query("kategoriId") kategoriId?: string,
    @Query("tokoId") tokoId?: string,
    @Query("search") search?: string,
    @Query("kota") kota?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("sortBy") sortBy?: string,
  ): Promise<any> {
    return this.findAllUC.execute({
      kategoriId,
      tokoId,
      search,
      kota,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      sortBy,
    });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("toko/:tokoId/all")
  @ApiOperation({
    summary: "Get ALL produk by toko (including draft/inactive)",
  })
  async getAllByStore(
    @Param("tokoId") tokoId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<any> {
    return this.findByStoreUC.execute(
      tokoId,
      page ? +page : undefined,
      limit ? +limit : undefined,
      false, // all
    );
  }

  @Get("toko/:tokoId")
  @ApiOperation({ summary: "Get active produk by toko" })
  async getByStore(
    @Param("tokoId") tokoId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<any> {
    return this.findByStoreUC.execute(
      tokoId,
      page ? +page : undefined,
      limit ? +limit : undefined,
      true, // active only
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(":id/stock-history")
  @ApiOperation({ summary: "Get stock history for a produk" })
  async getStockHistory(
    @Param("id") id: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<any> {
    return this.getStockHistoryUC.execute(
      id,
      page ? +page : undefined,
      limit ? +limit : undefined,
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Get produk by ID" })
  async findOne(@Param("id") id: string): Promise<any> {
    return this.findOneUC.execute(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("toko/:tokoId")
  @ApiOperation({ summary: "Create produk for toko (gudang staff)" })
  async create(
    @Param("tokoId") tokoId: string,
    @Body() payload: CreateProductDto,
    @CurrentUser("sub") penggunaId: string,
  ): Promise<any> {
    return this.createUC.execute(tokoId, payload, penggunaId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(":id/status")
  @ApiOperation({
    summary: "Update produk status — PENJUAL only (etalase toggle)",
  })
  async updateStatus(
    @Param("id") id: string,
    @Body() payload: UpdateProductStatusDto,
  ): Promise<any> {
    return this.updateStatusUC.execute(id, payload.status);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(":id/stock")
  @ApiOperation({
    summary: "Update produk stock — WAREHOUSE only (IN/OUT/ADJUSTMENT)",
  })
  async updateStock(
    @Param("id") id: string,
    @Body() payload: UpdateProductStockDto,
    @CurrentUser("sub") penggunaId: string,
  ): Promise<any> {
    return this.updateStockUC.execute(id, penggunaId, payload);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(":id")
  @ApiOperation({
    summary: "Update produk details (nama, desc, price etc. — not stock)",
  })
  async update(
    @Param("id") id: string,
    @Body() payload: UpdateProductDto,
  ): Promise<any> {
    return this.updateUC.execute(id, payload as any);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(":id/photos")
  @ApiOperation({
    summary: "Update produk photos (min 2, max 3)",
  })
  async updatePhotos(
    @Param("id") id: string,
    @Body() payload: UpdateProductPhotosDto,
  ): Promise<any> {
    return this.updatePhotosUC.execute(id, payload.fotoUrls);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(":id")
  @ApiOperation({ summary: "Delete produk" })
  async remove(@Param("id") id: string): Promise<any> {
    return this.removeUC.execute(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @SkipTransform()
  @Get("penjual/:tokoId/laporan-stok/excel")
  @ApiOperation({ summary: "Seller: download stock history report as Excel" })
  async downloadStockReport(
    @Param("tokoId") tokoId: string,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Res() res: Response,
  ): Promise<any> {
    const buffer = await this.generateStockReportUC.execute(
      tokoId,
      startDate,
      endDate,
    );
    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=Laporan_Stok_${tokoId}.xlsx`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get(":produkId/varian")
  @ApiOperation({ summary: "Get all packaging variants of a product" })
  async getVarians(@Param("produkId") produkId: string) {
    return this.productsRepo.findManyVarian({
      where: { produkId },
      orderBy: { ukuranKg: "asc" },
    });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch("varian/:id")
  @ApiOperation({ summary: "Update packaging variant price/status" })
  async updateVarian(
    @Param("id") id: string,
    @Body() payload: { biayaTambahan?: number; isActive?: boolean },
  ) {
    return this.productsRepo.updateVarian({
      where: { id },
      data: {
        biayaTambahan:
          payload.biayaTambahan !== undefined
            ? Number(payload.biayaTambahan)
            : undefined,
        isActive:
          payload.isActive !== undefined
            ? Boolean(payload.isActive)
            : undefined,
      },
    });
  }
}
