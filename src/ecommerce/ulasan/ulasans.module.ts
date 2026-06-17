import { Module } from "@nestjs/common";

import { ReviewsController } from "./ulasans.controller";
import { PrismaService } from "../../infrastructure/database/prisma.service";
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

@Module({
  controllers: [ReviewsController],
  providers: [
    PrismaService,
    CreateReviewUseCase,
    GetProductReviewsUseCase,
    GetProductReviewsForSellerUseCase,
    ReportReviewUseCase,
    AdminGetReportedReviewsUseCase,
    AdminApproveTakedownUseCase,
    AdminRejectTakedownUseCase,
    GetOrderReviewStatusUseCase,
    SellerGetAllReviewsUseCase,
    AdminGetAllReviewsUseCase,
  ],
})
export class ReviewsModule {}
