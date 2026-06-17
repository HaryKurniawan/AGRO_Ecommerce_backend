import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback, Profile } from "passport-google-oauth20";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(config: ConfigService) {
    super({
      clientID: config.getOrThrow<string>("GOOGLE_CLIENT_ID"),
      clientSecret: config.getOrThrow<string>("GOOGLE_CLIENT_SECRET"),
      callbackURL: config.getOrThrow<string>("GOOGLE_CALLBACK_URL"),
      scope: ["email", "profile"],
      passReqToCallback: true, // Diperlukan agar state (origin) dari guard diteruskan ke callback
    });
  }

  async validate(
    _req: any,
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const { id, name, emails, photos } = profile;
    const givenName = name?.givenName || "";
    const familyName = name?.familyName || "";
    const namaLengkap = `${givenName} ${familyName}`.trim() || "Pengguna";

    const pengguna = {
      googleId: id,
      email: emails?.[0].value,
      nama: namaLengkap,
      picture: photos && photos.length > 0 ? photos[0].value : null,
    };
    done(null, pengguna);
  }
}
