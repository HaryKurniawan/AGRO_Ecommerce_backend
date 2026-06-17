import { Global, Module } from "@nestjs/common";

import { PrometheusService } from "./prometheus.service";
import { MetricsInterceptor } from "./metrics.interceptor";
import { HealthController } from "./health.controller";

@Global()
@Module({
  controllers: [HealthController],
  providers: [PrometheusService, MetricsInterceptor],
  exports: [PrometheusService, MetricsInterceptor],
})
export class MonitoringModule {}
