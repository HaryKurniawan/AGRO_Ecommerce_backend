import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Optional()
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger?: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();
    const className = context.getClass().name;
    const handlerName = context.getHandler().name;

    const isStream =
      url.includes("/stream") ||
      request.headers["accept"]?.includes("text/event-stream");
    if (isStream) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - now;
        const message = `${method} ${url} → ${className}.${handlerName} (${responseTime}ms)`;

        if (this.logger) {
          this.logger.info(message, { context: "HTTP" });
        }
      }),
    );
  }
}
