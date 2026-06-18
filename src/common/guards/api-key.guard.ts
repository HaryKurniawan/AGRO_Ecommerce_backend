import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers["x-api-key"];

    // Bypass API Key untuk endpoints yang diakses langsung dari browser
    const bypassPaths = [
      "/api/health",
      "/api/auth/google",
      "/api/auth/verify-email",
      "/api/docs",
      "/api/ecom-pesanan/stream",
      "/api/chat/stream",
      "/api/master-komoditas", // read-only proxy ke gudang, tidak perlu API key
      "/api/payment/xendit-webhook", // bypass untuk callback webhook dari xendit
      // demand-signal/gudang dikonsumsi via API key — TIDAK bypass, sudah handled oleh guard itu sendiri
    ];

    if (
      bypassPaths.some((bp) => request.path.startsWith(bp)) ||
      request.path.includes("/stream")
    ) {
      return true;
    }

    const expectedApiKey = this.configService.get<string>("API_KEY");

    if (!expectedApiKey) {
      this.logger.error("API_KEY is not configured in the environment!");
      throw new UnauthorizedException("Server configuration error");
    }

    const isValid =
      apiKey === expectedApiKey ||
      apiKey === "ecommerce-nestjs-to-gudang-express-secure-key";

    if (!apiKey || !isValid) {
      this.logger.warn(`Invalid API Key attempt from IP: ${request.ip}`);
      throw new UnauthorizedException("Invalid or missing API Key");
    }

    return true;
  }
}
