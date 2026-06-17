import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class GoogleAuthGuard extends AuthGuard("google") {
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const origin = request.query.origin || "ecommerce";

    return {
      prompt: "select_account",
      accessType: "offline",
      state: origin, // Meneruskan origin ke Google agar dikirim balik saat callback
    };
  }
}
