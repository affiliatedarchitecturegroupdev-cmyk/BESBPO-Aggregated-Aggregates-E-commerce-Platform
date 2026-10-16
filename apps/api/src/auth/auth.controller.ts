import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import type { AuthUser } from "../common/auth/auth-user";
import { Public } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AccountEmailsService } from "./account-emails.service";
import { AuthService } from "./auth.service";
import { EmailTokenDto, ForgotPasswordDto, ResetPasswordDto } from "./dto/account-email.dto";
import { LoginDto } from "./dto/login.dto";
import { OAuthCallbackDto, OAuthCompleteDto, OAuthStartDto } from "./dto/oauth.dto";
import { OAuthService } from "./oauth/oauth.service";
import { RegisterDto } from "./dto/register.dto";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauth: OAuthService,
    private readonly accountEmails: AccountEmailsService,
  ) {}

  @Public()
  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.registerWithEmail(dto);
  }

  @Public()
  @Post("login")
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authService.loginWithEmail(dto.email, dto.password);
  }

  /** "Forgot your password?" — emails a one-time link if the account exists (the answer is the same either way). */
  @Public()
  @Post("password/forgot")
  @HttpCode(200)
  forgot(@Body() dto: ForgotPasswordDto) {
    return this.accountEmails.requestPasswordReset(dto.email);
  }

  /** Sets a new password from the emailed link, ends every other session, and signs this one in. */
  @Public()
  @Post("password/reset")
  @HttpCode(200)
  async reset(@Body() dto: ResetPasswordDto) {
    const { userId } = await this.accountEmails.resetPassword(dto.token, dto.newPassword);
    return this.authService.signIn(userId);
  }

  @Public()
  @Post("email/verify")
  @HttpCode(200)
  verify(@Body() dto: EmailTokenDto) {
    return this.accountEmails.verifyEmail(dto.token);
  }

  @Post("email/verify/resend")
  @HttpCode(200)
  resendVerification(@CurrentUser() user: AuthUser) {
    return this.accountEmails.sendVerification(user.id);
  }

  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.authService.profile(user.id);
  }

  /** Which sign-in providers are switched on (client ID and secret set). */
  @Public()
  @Get("oauth/providers")
  providers() {
    return this.oauth.providers();
  }

  @Public()
  @Post("oauth/:provider/start")
  @HttpCode(200)
  start(@Param("provider") provider: string, @Body() dto: OAuthStartDto) {
    return this.oauth.start(provider, dto.redirectUri);
  }

  @Public()
  @Post("oauth/:provider/callback")
  @HttpCode(200)
  callback(@Param("provider") provider: string, @Body() dto: OAuthCallbackDto) {
    return this.oauth.callback(provider, dto);
  }

  /** Finishes signing up when the provider shared no email address (Instagram, some X accounts). */
  @Public()
  @Post("oauth/complete")
  @HttpCode(200)
  complete(@Body() dto: OAuthCompleteDto) {
    return this.oauth.complete(dto.pendingToken, dto.email, dto.name);
  }
}
