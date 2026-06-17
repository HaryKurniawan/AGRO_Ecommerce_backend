import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, map } from "rxjs";
import { SKIP_TRANSFORM_KEY } from "../decorators/skip-transform.decorator";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Check for SkipTransform metadata
    const skipTransform = this.reflector.getAllAndOverride<boolean>(
      SKIP_TRANSFORM_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipTransform) {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse();
    const request = context.switchToHttp().getRequest();

    // Skip transformation ONLY for actual SSE (Server-Sent Events) streams
    const isStream =
      (response.getHeader &&
        String(response.getHeader("Content-Type")).includes(
          "text/event-stream",
        )) ||
      (request.url && request.url.endsWith("/stream")) ||
      (request.headers["accept"] &&
        request.headers["accept"].includes("text/event-stream"));

    if (isStream) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
