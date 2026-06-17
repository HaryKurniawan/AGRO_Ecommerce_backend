import { Injectable, OnModuleInit } from "@nestjs/common";
import * as client from "prom-client";

@Injectable()
export class PrometheusService implements OnModuleInit {
  private readonly register: client.Registry;
  public readonly httpRequestDuration: client.Histogram;
  public readonly httpRequestTotal: client.Counter;
  public readonly activeConnections: client.Gauge;

  constructor() {
    this.register = new client.Registry();

    client.collectDefaultMetrics({ register: this.register });

    this.httpRequestDuration = new client.Histogram({
      name: "http_request_duration_seconds",
      help: "Duration of HTTP requests in seconds",
      labelNames: ["method", "route", "status_code"],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.register],
    });

    this.httpRequestTotal = new client.Counter({
      name: "http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "route", "status_code"],
      registers: [this.register],
    });

    this.activeConnections = new client.Gauge({
      name: "http_active_connections",
      help: "Number of active HTTP connections",
      registers: [this.register],
    });
  }

  onModuleInit() {
    // Metrics are initialized in constructor
  }

  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  getContentType(): string {
    return this.register.contentType;
  }
}
