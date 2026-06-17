import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";

interface JwtPayload {
  sub: string;
  email: string;
  peran: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET") || "default-secret",
    });
  }

  async validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      sub: payload.sub,
      email: payload.email,
      peran: payload.peran,
    };
  }
}
