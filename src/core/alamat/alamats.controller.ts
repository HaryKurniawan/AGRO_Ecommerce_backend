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

import { AddressesService } from "./alamats.service";
import { JwtAuthGuard } from "../../core/auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-pengguna.decorator";

@ApiTags("Alamat")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller("alamat")
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiOperation({ summary: "Get my alamat" })
  findByUser(@CurrentUser("sub") penggunaId: string) {
    return this.addressesService.findByUser(penggunaId);
  }

  @Post()
  @ApiOperation({ summary: "Create alamat" })
  create(
    @CurrentUser("sub") penggunaId: string,
    @Body() data: Parameters<AddressesService["create"]>[1],
  ) {
    return this.addressesService.create(penggunaId, data);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update alamat" })
  update(
    @Param("id") id: string,
    @CurrentUser("sub") penggunaId: string,
    @Body() data: Record<string, unknown>,
  ) {
    return this.addressesService.update(id, penggunaId, data);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete alamat" })
  remove(@Param("id") id: string, @CurrentUser("sub") penggunaId: string) {
    return this.addressesService.remove(id, penggunaId);
  }

  @Patch(":id/default")
  @ApiOperation({ summary: "Set alamat as default" })
  setDefault(@Param("id") id: string, @CurrentUser("sub") penggunaId: string) {
    return this.addressesService.setDefault(id, penggunaId);
  }
}
