import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
  ParseIntPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

import { NotificationsService } from "./notifikasis.service";
import { JwtAuthGuard } from "../../core/auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-pengguna.decorator";

@ApiTags("Notifikasi")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller("notifikasi")
export class NotificationsController {
  constructor(private readonly notifService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "Get my notifikasi" })
  async findByUser(
    @CurrentUser("sub") penggunaId: string,
    @Query("page", new ParseIntPipe({ optional: true })) page: number = 1,
    @Query("limit", new ParseIntPipe({ optional: true })) limit: number = 20,
  ): Promise<any> {
    return this.notifService.findByUser(penggunaId, page, limit);
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Mark notifikasi as read" })
  async markAsRead(
    @Param("id") id: string,
    @CurrentUser("sub") penggunaId: string,
  ): Promise<any> {
    return this.notifService.markAsRead(id, penggunaId);
  }

  @Patch("read-all")
  @ApiOperation({ summary: "Mark all notifikasi as read" })
  async markAllAsRead(@CurrentUser("sub") penggunaId: string): Promise<any> {
    return this.notifService.markAllAsRead(penggunaId);
  }
}
