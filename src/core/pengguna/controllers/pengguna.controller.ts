import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";

import { CreateUserDto } from "../dto/create-pengguna.dto";
import { UpdateUserDto } from "../dto/update-pengguna.dto";
import { JwtAuthGuard } from "../../../core/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles } from "../../../common/decorators/roles.decorator";
import { CreateUserUseCase } from "../use-cases/create-pengguna.usecase";
import { UpdateUserUseCase } from "../use-cases/update-pengguna.usecase";
import { FindAllUsersUseCase } from "../use-cases/find-all-penggunas.usecase";
import { FindUserByIdUseCase } from "../use-cases/find-pengguna-by-id.usecase";
import { DeleteUserUseCase } from "../use-cases/delete-pengguna.usecase";
import { UpdateProfileStatusUseCase } from "../use-cases/update-profile-status.usecase";
import { GetSellerCourierAffiliationsUseCase } from "../use-cases/get-seller-courier-affiliations.usecase";
import { GetAllCouriersUseCase } from "../use-cases/get-all-couriers.usecase";
import { CreateSellerWithCourierUseCase } from "../use-cases/create-seller-with-courier.usecase";
import { UpdateSellerCourierAffiliationUseCase } from "../use-cases/update-seller-courier-affiliation.usecase";
import { CurrentUser } from "../../../common/decorators/current-pengguna.decorator";
import { FindAllActivityLogsUseCase } from "../use-cases/find-all-activity-logs.usecase";
import { ToggleSellerStatusUseCase } from "../use-cases/toggle-seller-status.usecase";

import { CreateSellerWithCourierDto } from "../dto/create-seller-with-courier.dto";
import { UpdateSellerCourierAffiliationDto } from "../dto/update-seller-courier-affiliation.dto";
import { ApproveUserProfileDto } from "../dto/approve-user-profile.dto";
import { ToggleSellerStatusDto } from "../dto/toggle-seller-status.dto";

@ApiTags("Pengguna")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("pengguna")
export class UsersController {
  constructor(
    private readonly createUserUC: CreateUserUseCase,
    private readonly updateUserUC: UpdateUserUseCase,
    private readonly findAllUsersUC: FindAllUsersUseCase,
    private readonly findUserByIdUC: FindUserByIdUseCase,
    private readonly deleteUserUC: DeleteUserUseCase,
    private readonly updateProfileStatusUC: UpdateProfileStatusUseCase,
    private readonly getSellerCourierAffiliationsUC: GetSellerCourierAffiliationsUseCase,
    private readonly getAllCouriersUC: GetAllCouriersUseCase,
    private readonly createSellerWithCourierUC: CreateSellerWithCourierUseCase,
    private readonly updateSellerCourierAffiliationUC: UpdateSellerCourierAffiliationUseCase,
    private readonly findAllActivityLogsUC: FindAllActivityLogsUseCase,
    private readonly toggleSellerStatusUC: ToggleSellerStatusUseCase,
  ) {}

  @Get("log-aktivitas")
  @Roles("ADMIN", "SUPER_ADMIN", "ADMIN_CS")
  @ApiOperation({
    summary: "Get all activity logs with pagination and filters (Admin only)",
  })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "kategori", required: false, type: String })
  @ApiQuery({ name: "search", required: false, type: String })
  async findActivityLogs(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("kategori") kategori?: string,
    @Query("search") search?: string,
  ): Promise<any> {
    return this.findAllActivityLogsUC.execute({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      kategori,
      search,
    });
  }

  @Post()
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "Create a new pengguna (Admin only)" })
  async create(@Body() dto: CreateUserDto): Promise<any> {
    return this.createUserUC.execute(dto);
  }

  @Get()
  @Roles("ADMIN", "SUPER_ADMIN", "ADMIN_CS")
  @ApiOperation({ summary: "Get all pengguna with pagination (Admin only)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "peran", required: false, isArray: true, type: String })
  @ApiQuery({ name: "search", required: false, type: String })
  async findAll(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("peran") peran?: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Query("search") _search?: string,
  ): Promise<any> {
    return this.findAllUsersUC.execute({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      peran,
    });
  }

  @Get("penjual-courier-affiliations")
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "Get all seller courier affiliations" })
  async getSellerCourierAffiliations(): Promise<any> {
    return this.getSellerCourierAffiliationsUC.execute();
  }

  @Get("all-couriers-for-selection")
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "Get all couriers for selection" })
  async getAllCouriersForSelection(): Promise<any> {
    return this.getAllCouriersUC.execute();
  }

  @Post("penjual-with-courier")
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "Create seller with courier affiliation" })
  async createSellerWithCourier(
    @Body() payload: CreateSellerWithCourierDto,
    @CurrentUser("sub") adminId: string,
  ): Promise<any> {
    return this.createSellerWithCourierUC.execute(payload, adminId);
  }

  @Patch("penjual/:tokoId/courier-affiliation")
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "Update seller courier affiliation" })
  async updateSellerCourierAffiliation(
    @Param("tokoId") tokoId: string,
    @Body() payload: UpdateSellerCourierAffiliationDto,
    @CurrentUser("sub") adminId: string,
  ): Promise<any> {
    return this.updateSellerCourierAffiliationUC.execute(
      tokoId,
      payload,
      adminId,
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Get pengguna by ID" })
  async findOne(@Param("id") id: string): Promise<any> {
    return this.findUserByIdUC.execute(id);
  }

  @Patch(":id")
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "Update pengguna (Admin only)" })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<any> {
    return this.updateUserUC.execute(id, dto);
  }

  @Patch(":id/approve")
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({
    summary: "Approve or reject a pengguna profile (Admin only)",
  })
  async updateProfileStatus(
    @Param("id") id: string,
    @Body() payload: ApproveUserProfileDto,
  ): Promise<any> {
    return this.updateProfileStatusUC.execute(
      id,
      payload.peran,
      payload.status,
    );
  }

  @Patch(":id/toggle-status")
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({
    summary: "Activate or deactivate a seller account (Admin only)",
  })
  async toggleSellerStatus(
    @Param("id") id: string,
    @Body() payload: ToggleSellerStatusDto,
    @CurrentUser("sub") adminId: string,
  ): Promise<any> {
    return this.toggleSellerStatusUC.execute(id, payload.aktif, adminId);
  }

  @Delete(":id")
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "Delete pengguna (Admin only)" })
  async remove(@Param("id") id: string): Promise<any> {
    return this.deleteUserUC.execute(id);
  }
}
