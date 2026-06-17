import { Controller, Get, Res } from "@nestjs/common";
import { Response } from "express";
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from "@nestjs/swagger";

import { PrometheusService } from "./prometheus.service";

@ApiTags("Health")
@Controller()
export class HealthController {
  constructor(private readonly prometheusService: PrometheusService) {}

  @Get("health")
  @ApiOperation({ summary: "Health check endpoint" })
  healthCheck() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get("metrics")
  @ApiExcludeEndpoint()
  async getMetrics(@Res() res: Response) {
    const metrics = await this.prometheusService.getMetrics();
    res.set("Content-Type", this.prometheusService.getContentType());
    res.send(metrics);
  }
}
