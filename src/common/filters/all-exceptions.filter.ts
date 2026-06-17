import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Inject,
  Optional,
} from "@nestjs/common";
import { Request, Response } from "express";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @Optional()
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger?: Logger,
  ) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception?.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception?.message || "Internal server error";

    if (this.logger) {
      this.logger.error(`Unhandled exception: ${message}`, {
        stack: exception?.stack,
        path: request.url,
        method: request.method,
      });
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        process.env.NODE_ENV === "production" && status === 500
          ? "Internal server error"
          : message,
    });
  }
}
