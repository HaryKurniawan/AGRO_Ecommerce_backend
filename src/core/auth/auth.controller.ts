import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  UseGuards,
  Query,
  Res,
  Req,
} from "@nestjs/common";
import { Response, Request } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { GoogleAuthGuard } from "./guards/google-auth.guard";
import { CurrentUser } from "../../common/decorators/current-pengguna.decorator";
import { LoginUseCase } from "./use-cases/login.usecase";
import { RegisterUseCase } from "./use-cases/register.usecase";
import { GetProfileUseCase } from "./use-cases/get-profile.usecase";
import { UpdateProfileUseCase } from "./use-cases/update-profile.usecase";
import { CreateGuestSessionUseCase } from "./use-cases/create-guest-session.usecase";
import { VerifyEmailUseCase } from "./use-cases/verify-email.usecase";
import { ResendVerificationUseCase } from "./use-cases/resend-verification.usecase";
import { ForgotPasswordUseCase } from "./use-cases/forgot-password.usecase";
import { ResetPasswordUseCase } from "./use-cases/reset-password.usecase";
import {
  GoogleAuthUseCase,
  GoogleProfile,
} from "./use-cases/google-auth.usecase";
import { LogoutUseCase } from "./use-cases/logout.usecase";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

import { CompleteProfileDto } from "./dto/complete-profile.dto";
import { ResendVerificationDto } from "./dto/resend-verification.dto";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly loginUC: LoginUseCase,
    private readonly registerUC: RegisterUseCase,
    private readonly getProfileUC: GetProfileUseCase,
    private readonly updateProfileUC: UpdateProfileUseCase,
    private readonly createGuestSessionUC: CreateGuestSessionUseCase,
    private readonly verifyEmailUC: VerifyEmailUseCase,
    private readonly resendVerificationUC: ResendVerificationUseCase,
    private readonly forgotPasswordUC: ForgotPasswordUseCase,
    private readonly resetPasswordUC: ResetPasswordUseCase,
    private readonly googleAuthUC: GoogleAuthUseCase,
    private readonly logoutUC: LogoutUseCase,
  ) {}

  @Post("register")
  @ApiOperation({ summary: "Register a new pengguna" })
  async register(@Body() dto: RegisterDto): Promise<any> {
    return this.registerUC.execute(dto);
  }

  @Post("login")
  @ApiOperation({ summary: "Login with email and kataSandi" })
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<any> {
    return this.loginUC.execute(dto, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("logout")
  @ApiOperation({ summary: "Logout and record activity" })
  async logout(
    @CurrentUser("sub") penggunaId: string,
    @Req() req: Request,
  ): Promise<any> {
    return this.logoutUC.execute(penggunaId, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }

  @Post("guest")
  @ApiOperation({ summary: "Create a temporary guest session" })
  async createGuestSession(): Promise<any> {
    return this.createGuestSessionUC.execute();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("profile")
  @ApiOperation({ summary: "Get current pengguna profile" })
  async getProfile(@CurrentUser("sub") penggunaId: string): Promise<any> {
    return this.getProfileUC.execute(penggunaId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch("profile")
  @ApiOperation({ summary: "Update current pengguna profile" })
  async updateProfile(
    @CurrentUser("sub") penggunaId: string,
    @Body() dto: CompleteProfileDto,
  ): Promise<any> {
    return this.updateProfileUC.execute(penggunaId, dto);
  }

  @Get("verify-email")
  @ApiOperation({ summary: "Verify email using token from email link" })
  async verifyEmail(@Query("token") token: string): Promise<any> {
    return this.verifyEmailUC.execute(token);
  }

  @Post("resend-verification")
  @ApiOperation({ summary: "Resend email verification link" })
  async resendVerification(
    @Body() payload: ResendVerificationDto,
  ): Promise<any> {
    return this.resendVerificationUC.execute(payload.email);
  }

  @Post("forgot-password")
  @ApiOperation({ summary: "Request kataSandi reset email" })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<any> {
    return this.forgotPasswordUC.execute(dto.email);
  }

  @Post("reset-password")
  @ApiOperation({ summary: "Reset kataSandi using token" })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<any> {
    return this.resetPasswordUC.execute(dto.token, dto.newPassword);
  }

  @Get("google")
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: "Initiate Google OAuth2 login" })
  async googleAuth(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Query("origin") _origin: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Res() _res: Response,
  ): Promise<any> {
    // google redirection is handled by Passport Guard
  }

  @Get("google/callback")
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: "Google OAuth2 callback" })
  async googleAuthCallback(
    @CurrentUser() googleProfile: GoogleProfile,
    @Req() req: any,
    @Res() res: Response,
  ): Promise<any> {
    const origin = req.query.state || "ecommerce";
    const isFarmer = origin === "farmer";
    const isAgroCore = origin === "agro-core";

    try {
      const result = await this.googleAuthUC.execute(googleProfile, {
        allowAutoRegister: !isFarmer && !isAgroCore,
      });

      const redirectBase = this.getFrontendUrl(origin);
      res.redirect(
        `${redirectBase}/auth/google/callback?token=${result.accessToken}&nama=${encodeURIComponent(result.pengguna.nama || "")}&email=${encodeURIComponent(result.pengguna.email)}&peran=${result.pengguna.peran}`,
      );
    } catch (error: any) {
      const redirectBase = this.getFrontendUrl(origin);
      const authErrorPath = "/login?error=" + "AUTH_FAILED" + "&message=";
      res.redirect(
        `${redirectBase}${authErrorPath}${encodeURIComponent(error.message)}`,
      );
    }
  }

  private getFrontendUrl(origin: string): string {
    if (origin === "agro-core") return process.env.FRONTEND_OPERASIONAL_URL || process.env.AGRO_CORE_FRONTEND_URL;
    return process.env.FRONTEND_URL;
  }
}
