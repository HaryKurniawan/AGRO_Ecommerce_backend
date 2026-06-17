import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  Patch,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

import { JwtAuthGuard } from "../../core/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-pengguna.decorator";
import { CreateReviewDto } from "./dto/create-ulasan.dto";
import { CreateReviewUseCase } from "./use-cases/create-ulasan.usecase";
import { GetProductReviewsUseCase } from "./use-cases/get-produk-ulasans.usecase";
import { GetProductReviewsForSellerUseCase } from "./use-cases/get-produk-ulasans-for-seller.usecase";
import { ReportReviewUseCase } from "./use-cases/report-ulasan.usecase";
import { AdminGetReportedReviewsUseCase } from "./use-cases/admin-get-reported-ulasans.usecase";
import { AdminApproveTakedownUseCase } from "./use-cases/admin-approve-takedown.usecase";
import { AdminRejectTakedownUseCase } from "./use-cases/admin-reject-takedown.usecase";
import { GetOrderReviewStatusUseCase } from "./use-cases/get-pesanan-ulasan-status.usecase";
import { SellerGetAllReviewsUseCase } from "./use-cases/seller-get-all-ulasans.usecase";
import { AdminGetAllReviewsUseCase } from "./use-cases/admin-get-all-ulasans.usecase";

@ApiTags("Ulasan")
@Controller("ulasan")
export class ReviewsController {
  constructor(
    private readonly createReviewUC: CreateReviewUseCase,
    private readonly getProductReviewsUC: GetProductReviewsUseCase,
    private readonly getProductReviewsForSellerUC: GetProductReviewsForSellerUseCase,
    private readonly reportReviewUC: ReportReviewUseCase,
    private readonly adminGetReportedReviewsUC: AdminGetReportedReviewsUseCase,
    private readonly adminApproveTakedownUC: AdminApproveTakedownUseCase,
    private readonly adminRejectTakedownUC: AdminRejectTakedownUseCase,
    private readonly getOrderReviewStatusUC: GetOrderReviewStatusUseCase,
    private readonly sellerGetAllReviewsUC: SellerGetAllReviewsUseCase,
    private readonly adminGetAllReviewsUC: AdminGetAllReviewsUseCase,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("PENJUAL")
  @ApiBearerAuth()
  @Get("penjual/all")
  @ApiOperation({ summary: "Seller: Get all ulasans for their store" })
  async getSellerReviews(
    @CurrentUser("sub") penggunaId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<any> {
    return this.sellerGetAllReviewsUC.execute(
      penggunaId,
      page ? +page : 1,
      limit ? +limit : 20,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @Get("admin/all")
  @ApiOperation({ summary: "Admin: Get all ulasans across the platform" })
  async adminGetAllReviews(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
  ): Promise<any> {
    return this.adminGetAllReviewsUC.execute(
      page ? +page : 1,
      limit ? +limit : 20,
      search,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: "Create a produk ulasan" })
  async createReview(
    @CurrentUser("sub") penggunaId: string,
    @Body() dto: CreateReviewDto,
  ): Promise<any> {
    return this.createReviewUC.execute(penggunaId, dto);
  }

  @Get("produk/:produkId")
  @ApiOperation({ summary: "Get ulasan for a produk" })
  async getProductReviews(
    @Param("produkId") produkId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("rating") rating?: string,
    @Query("sortBy") sortBy?: string,
  ): Promise<any> {
    return this.getProductReviewsUC.execute(
      produkId,
      page ? +page : 1,
      limit ? +limit : 10,
      rating ? +rating : undefined,
      sortBy,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("PENJUAL")
  @ApiBearerAuth()
  @Get("penjual/produk/:produkId")
  @ApiOperation({ summary: "Seller: Get ulasan for their produk" })
  async getProductReviewsForSeller(
    @Param("produkId") produkId: string,
    @Query("tokoId") tokoId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<any> {
    return this.getProductReviewsForSellerUC.execute(
      produkId,
      tokoId,
      page ? +page : 1,
      limit ? +limit : 20,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("PENJUAL")
  @ApiBearerAuth()
  @Post(":id/report")
  @ApiOperation({ summary: "Seller: Report an inappropriate ulasan" })
  async reportReview(
    @Param("id") reviewId: string,
    @CurrentUser("sub") penggunaId: string,
    @Body("alasan") alasan: string,
  ): Promise<any> {
    return this.reportReviewUC.execute(reviewId, penggunaId, alasan);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @Get("admin/reported")
  @ApiOperation({ summary: "Admin: Get reported ulasan" })
  async adminGetReportedReviews(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: string,
  ): Promise<any> {
    return this.adminGetReportedReviewsUC.execute(
      page ? +page : 1,
      limit ? +limit : 20,
      status,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @Patch("admin/:id/approve-takedown")
  @ApiOperation({ summary: "Admin: Approve takedown (hide ulasan)" })
  async adminApproveTakedown(@Param("id") id: string): Promise<any> {
    return this.adminApproveTakedownUC.execute(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @Patch("admin/:id/reject-takedown")
  @ApiOperation({ summary: "Admin: Reject takedown" })
  async adminRejectTakedown(@Param("id") id: string): Promise<any> {
    return this.adminRejectTakedownUC.execute(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("pesanan/:pesananId/status")
  @ApiOperation({ summary: "Check ulasan status for item in an pesanan" })
  async getOrderReviewStatus(
    @Param("pesananId") pesananId: string,
    @CurrentUser("sub") penggunaId: string,
  ): Promise<any> {
    return this.getOrderReviewStatusUC.execute(pesananId, penggunaId);
  }
}
