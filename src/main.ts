import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import helmet from "helmet";
import * as express from "express";
import * as dns from "dns";

// Fix for Node.js 17+ hanging on IPv6 when calling Google APIs
dns.setDefaultResultOrder("ipv4first");

import { AppModule } from "./app.module";
import { setupSwagger } from "./docs/swagger.config";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { ApiKeyGuard } from "./common/guards/api-key.guard";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Use Winston as the application logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  const configService = app.get(ConfigService);
  const port = configService.get<number>("app.port", 4000);
  const corsOrigins = configService.get<string[]>("app.corsOrigins") || ["*"];

  // Security headers
    app.use(
      helmet({
        crossOriginOpenerPolicy: false,
        originAgentCluster: false,
      }),
    );

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Increase payload limits for face recognition base64 data
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

  // Global API Key Guard (Requires X-API-KEY header)
  const apiKeyGuard = new ApiKeyGuard(configService);
  app.useGlobalGuards(apiKeyGuard);

  // CORS
  const isCorsWildcard = corsOrigins.includes("*") || corsOrigins.length === 0;
  app.enableCors({
    origin: isCorsWildcard ? true : corsOrigins,
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix("api");

  // Swagger documentationn
  setupSwagger(app);

  await app.listen(port, "0.0.0.0");

  console.log(`🚀 API running on http://localhost:${port}`);

  console.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
