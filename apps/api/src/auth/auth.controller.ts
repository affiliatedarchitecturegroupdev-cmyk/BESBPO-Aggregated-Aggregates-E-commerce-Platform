import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import type { AuthUser } from "../common/auth/auth-user";
import { Public } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { OAuthCallbackDto, OAuthCompleteDto, OAuthStartDto } from "./dto/oauth.dto";
import { OAuthService } from "./oauth/oauth.service";
import { RegisterDto } from "./dto/register.dto";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauth: OAuthService,
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
