import { Controller, Get, Put, Body, UseGuards } from "@nestjs/common";
import { PajakService } from "./pajak.service";
import { UpdatePajakDto } from "./dto/update-pajak.dto";
import { JwtAuthGuard } from "../../core/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../core/auth/guards/roles.guard";
import { Roles } from "../../core/auth/decorators/roles.decorator";
import { Peran } from "@prisma/client";

@Controller("pajak")
export class PajakController {
  constructor(private readonly pajakService: PajakService) {}

  @Get("config")
  async getConfig() {
    const config = await this.pajakService.getConfig();
    return {
      status: "success",
      data: config,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Peran.SUPER_ADMIN)
  @Put("config")
  async updateConfig(@Body() updatePajakDto: UpdatePajakDto) {
    const config = await this.pajakService.updateConfig(updatePajakDto);
    return {
      status: "success",
      message: "Konfigurasi PPN berhasil diperbarui",
      data: config,
    };
  }
}
