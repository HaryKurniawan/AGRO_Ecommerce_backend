import { Module } from "@nestjs/common";

import { UsersController } from "./controllers/pengguna.controller";
import { PenggunasRepository } from "./repositories/pengguna.repository";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { CreateUserUseCase } from "./use-cases/create-pengguna.usecase";
import { UpdateUserUseCase } from "./use-cases/update-pengguna.usecase";
import { FindAllUsersUseCase } from "./use-cases/find-all-penggunas.usecase";
import { FindUserByIdUseCase } from "./use-cases/find-pengguna-by-id.usecase";
import { DeleteUserUseCase } from "./use-cases/delete-pengguna.usecase";
import { UpdateProfileStatusUseCase } from "./use-cases/update-profile-status.usecase";
import { GetSellerCourierAffiliationsUseCase } from "./use-cases/get-seller-courier-affiliations.usecase";
import { GetAllCouriersUseCase } from "./use-cases/get-all-couriers.usecase";
import { CreateSellerWithCourierUseCase } from "./use-cases/create-seller-with-courier.usecase";
import { UpdateSellerCourierAffiliationUseCase } from "./use-cases/update-seller-courier-affiliation.usecase";
import { FindAllActivityLogsUseCase } from "./use-cases/find-all-activity-logs.usecase";
import { ToggleSellerStatusUseCase } from "./use-cases/toggle-seller-status.usecase";

@Module({
  controllers: [UsersController],
  providers: [
    PrismaService,
    PenggunasRepository,
    CreateUserUseCase,
    UpdateUserUseCase,
    FindAllUsersUseCase,
    FindUserByIdUseCase,
    DeleteUserUseCase,
    UpdateProfileStatusUseCase,
    GetSellerCourierAffiliationsUseCase,
    GetAllCouriersUseCase,
    CreateSellerWithCourierUseCase,
    UpdateSellerCourierAffiliationUseCase,
    FindAllActivityLogsUseCase,
    ToggleSellerStatusUseCase,
  ],
  exports: [PenggunasRepository, FindUserByIdUseCase],
})
export class UsersModule {}
