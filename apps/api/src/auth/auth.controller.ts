import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import type { AuthUser } from "../common/auth/auth-user";
import { Public } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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

  // Google and Microsoft OAuth routes are wired via @nestjs/passport
  // AuthGuard('google' | 'microsoft') once client credentials and redirect
  // URIs are registered.
}
