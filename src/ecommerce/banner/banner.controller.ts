import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Res,
  StreamableFile,
} from "@nestjs/common";
import type { Response } from "express";
import { createReadStream } from "fs";
import { join } from "path";
import { BannerService } from "./banner.service";
import { JwtAuthGuard } from "../../core/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../core/auth/guards/roles.guard";
import { Roles } from "../../core/auth/decorators/roles.decorator";
import { Peran } from "@prisma/client";

@Controller("banner")
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Get()
  findAllPublic() {
    return this.bannerService.findAllPublic();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Peran.SUPER_ADMIN)
  @Get("admin/template/download")
  downloadTemplate(@Res({ passthrough: true }) res: Response): StreamableFile {
    const file = createReadStream(
      join(process.cwd(), "public", "templates", "banner_template.png")
    );
    res.set({
      "Content-Type": "image/png",
      "Content-Disposition": 'attachment; filename="banner_template.png"',
    });
    return new StreamableFile(file);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Peran.SUPER_ADMIN)
  @Get("admin")
  findAllAdmin() {
    return this.bannerService.findAllAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Peran.SUPER_ADMIN)
  @Post("admin")
  create(@Body() createBannerDto: any) {
    return this.bannerService.create(createBannerDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Peran.SUPER_ADMIN)
  @Patch("admin/reorder")
  reorder(@Body("orderedIds") orderedIds: string[]) {
    return this.bannerService.reorder(orderedIds);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Peran.SUPER_ADMIN)
  @Patch("admin/:id")
  update(@Param("id") id: string, @Body() updateBannerDto: any) {
    return this.bannerService.update(id, updateBannerDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Peran.SUPER_ADMIN)
  @Delete("admin/:id")
  delete(@Param("id") id: string) {
    return this.bannerService.delete(id);
  }
}
