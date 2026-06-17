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
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

import { JwtAuthGuard } from "../../core/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

import { CreateMasterProdukUseCase } from "./use-cases/create-master-produk.usecase";
import { UpdateMasterProdukUseCase } from "./use-cases/update-master-produk.usecase";
import { DeleteMasterProdukUseCase } from "./use-cases/delete-master-produk.usecase";
import { FindAllMasterProdukUseCase } from "./use-cases/find-all-master-produk.usecase";
import { FindOneMasterProdukUseCase } from "./use-cases/find-one-master-produk.usecase";
import { MapGudangMasterProdukUseCase } from "./use-cases/map-gudang-master-produk.usecase";
import { UnmapGudangMasterProdukUseCase } from "./use-cases/unmap-gudang-master-produk.usecase";

import { CreateMasterProdukDto } from "./dto/create-master-produk.dto";
import { UpdateMasterProdukDto } from "./dto/update-master-produk.dto";
import { CreateMappingDto } from "./dto/create-mapping.dto";

@ApiTags("Master Produk")
@Controller("master-produk")
export class MasterProdukController {
  constructor(
    private readonly createUC: CreateMasterProdukUseCase,
    private readonly updateUC: UpdateMasterProdukUseCase,
    private readonly deleteUC: DeleteMasterProdukUseCase,
    private readonly findAllUC: FindAllMasterProdukUseCase,
    private readonly findOneUC: FindOneMasterProdukUseCase,
    private readonly mapGudangUC: MapGudangMasterProdukUseCase,
    private readonly unmapGudangUC: UnmapGudangMasterProdukUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: "Get all master produk with search and filters" })
  async findAll(
    @Query("search") search?: string,
    @Query("kategoriId") kategoriId?: string,
    @Query("isActive") isActive?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<any> {
    return this.findAllUC.execute({
      search,
      kategoriId,
      isActive,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Get(":idOrSlug")
  @ApiOperation({ summary: "Get a single master produk by ID or slug" })
  async findOne(@Param("idOrSlug") idOrSlug: string): Promise<any> {
    return this.findOneUC.execute(idOrSlug);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: "Create a new master produk (Admin only)" })
  async create(@Body() payload: CreateMasterProdukDto): Promise<any> {
    return this.createUC.execute(payload);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @Patch(":id")
  @ApiOperation({ summary: "Update master produk details (Admin only)" })
  async update(
    @Param("id") id: string,
    @Body() payload: UpdateMasterProdukDto,
  ): Promise<any> {
    return this.updateUC.execute(id, payload);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @Delete(":id")
  @ApiOperation({ summary: "Delete a master produk (Admin only)" })
  async remove(@Param("id") id: string): Promise<any> {
    return this.deleteUC.execute(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @Post(":id/mapping")
  @ApiOperation({
    summary: "Map a master produk to a warehouse product (Admin only)",
  })
  async mapGudang(
    @Param("id") id: string,
    @Body() payload: CreateMappingDto,
  ): Promise<any> {
    return this.mapGudangUC.execute(id, payload);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @Delete(":id/mapping/:mappingId")
  @ApiOperation({ summary: "Remove a warehouse product mapping (Admin only)" })
  async unmapGudang(
    @Param("id") id: string,
    @Param("mappingId") mappingId: string,
  ): Promise<any> {
    return this.unmapGudangUC.execute(id, mappingId);
  }
}
