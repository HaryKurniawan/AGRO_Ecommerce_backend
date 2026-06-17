import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

import { JwtAuthGuard } from "../../../core/auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../../common/decorators/current-pengguna.decorator";
import { CreatePesananGrosirUseCase } from "../use-cases/create-pesanan-grosir.usecase";
import { KonfirmasiPesananGrosirUseCase } from "../use-cases/konfirmasi-pesanan-grosir.usecase";
import { AjukanGrosirKeGudangUseCase } from "../use-cases/ajukan-grosir-ke-gudang.usecase";
import { CreatePesananGrosirDto } from "../dto/create-pesanan-grosir.dto";
import { KonfirmasiPesananGrosirDto } from "../dto/konfirmasi-pesanan-grosir.dto";

@ApiTags("Ecom Pesanan - Grosir")
@Controller("ecom-pesanan")
export class PesananGrosirController {
  constructor(
    private readonly createGrosirUC: CreatePesananGrosirUseCase,
    private readonly konfirmasiGrosirUC: KonfirmasiPesananGrosirUseCase,
    private readonly ajukanGrosirKeGudangUC: AjukanGrosirKeGudangUseCase,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("grosir")
  @ApiOperation({ summary: "Create new pesanan grosir (Beli Jumlah Besar)" })
  async createGrosir(
    @CurrentUser("sub") penggunaId: string,
    @Body() payload: CreatePesananGrosirDto,
  ): Promise<any> {
    return this.createGrosirUC.execute(penggunaId, payload);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(":id/konfirmasi-grosir")
  @ApiOperation({
    summary: "Seller: Konfirmasi & teruskan pesanan grosir ke Gudang",
  })
  async konfirmasiGrosir(
    @CurrentUser("sub") penggunaId: string,
    @Param("id") id: string,
    @Body() payload: KonfirmasiPesananGrosirDto,
  ): Promise<any> {
    return this.konfirmasiGrosirUC.execute(penggunaId, id, payload);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(":id/ajukan-gudang")
  @ApiOperation({
    summary: "Seller: Ajukan manual pesanan grosir yg sudah dibayar ke Gudang",
  })
  async ajukanGudang(
    @CurrentUser("sub") penggunaId: string,
    @Param("id") id: string,
    @Body() payload: { gudangId: string },
  ): Promise<any> {
    return this.ajukanGrosirKeGudangUC.execute(penggunaId, id, payload);
  }
}
