import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

import { DashboardService } from "./dashboard.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@ApiTags("Core Dashboard")
@Controller("core/dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @Get("stats")
  @ApiOperation({
    summary: "Get overall ecosystem statistics for Super Admin dashboard",
  })
  async getStats() {
    return this.dashboardService.getStats();
  }
}
