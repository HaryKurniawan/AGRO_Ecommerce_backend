import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { LoginUseCase } from "./use-cases/login.usecase";
import { RegisterUseCase } from "./use-cases/register.usecase";
import { GetProfileUseCase } from "./use-cases/get-profile.usecase";
import { UpdateProfileUseCase } from "./use-cases/update-profile.usecase";
import { CreateGuestSessionUseCase } from "./use-cases/create-guest-session.usecase";
import { GoogleStrategy } from "./strategies/google.strategy";
import { VerifyEmailUseCase } from "./use-cases/verify-email.usecase";
import { ResendVerificationUseCase } from "./use-cases/resend-verification.usecase";
import { ForgotPasswordUseCase } from "./use-cases/forgot-password.usecase";
import { ResetPasswordUseCase } from "./use-cases/reset-password.usecase";
import { GoogleAuthUseCase } from "./use-cases/google-auth.usecase";
import { LogoutUseCase } from "./use-cases/logout.usecase";
import { EmailService } from "../../common/services/email.service";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          expiresIn:
            configService.get<string>("JWT_EXPIRES_IN")?.replace(/['"]/g, "")?.trim() ||
            "7d",
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    LoginUseCase,
    RegisterUseCase,
    GetProfileUseCase,
    UpdateProfileUseCase,
    CreateGuestSessionUseCase,
    GoogleStrategy,
    VerifyEmailUseCase,
    ResendVerificationUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    GoogleAuthUseCase,
    LogoutUseCase,
    EmailService,
  ],
  exports: [],
})
export class AuthModule {}
