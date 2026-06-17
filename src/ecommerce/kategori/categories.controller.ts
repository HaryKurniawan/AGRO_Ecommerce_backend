import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

import { CategoriesService } from "./categories.service";
import { JwtAuthGuard } from "../../core/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";

@ApiTags("Categories")
@Controller("kategori")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: "Get all kategori" })
  async findAll(): Promise<any> {
    return this.categoriesService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get kategori by ID" })
  async findOne(@Param("id") id: string): Promise<any> {
    return this.categoriesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: "Create kategori (admin only)" })
  async create(@Body() payload: CreateCategoryDto): Promise<any> {
    return this.categoriesService.create(payload);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiBearerAuth()
  @Patch(":id")
  @ApiOperation({ summary: "Update kategori (admin only)" })
  async update(
    @Param("id") id: string,
    @Body() payload: UpdateCategoryDto,
  ): Promise<any> {
    return this.categoriesService.update(id, payload);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiBearerAuth()
  @Delete(":id")
  @ApiOperation({ summary: "Delete kategori (admin only)" })
  async remove(@Param("id") id: string): Promise<any> {
    return this.categoriesService.remove(id);
  }
}
