import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { Request, Response } from "express";

import { PrometheusService } from "./prometheus.service";

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly prometheusService: PrometheusService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const startTime = Date.now();

    this.prometheusService.activeConnections.inc();

    // Skip metrics for SSE streams to avoid interference and excessive noise
    const isStream =
      (request.url && request.url.includes("/stream")) ||
      (request.headers["accept"] &&
        request.headers["accept"].includes("text/event-stream"));

    if (isStream) {
      return next.handle().pipe(
        tap({
          finalize: () => {
            this.prometheusService.activeConnections.dec();
          },
        }),
      );
    }

    return next.handle().pipe(
      tap({
        next: () => {
          this.recordMetrics(request, response, startTime);
        },
        error: () => {
          this.recordMetrics(request, response, startTime);
        },
        finalize: () => {
          this.prometheusService.activeConnections.dec();
        },
      }),
    );
  }

  private recordMetrics(
    request: Request,
    response: Response,
    startTime: number,
  ) {
    const duration = (Date.now() - startTime) / 1000;
    const route = request.route?.path || request.path;
    const method = request.method;
    const statusCode = response.statusCode.toString();

    this.prometheusService.httpRequestDuration.observe(
      { method, route, status_code: statusCode },
      duration,
    );

    this.prometheusService.httpRequestTotal.inc({
      method,
      route,
      status_code: statusCode,
    });
  }
}
