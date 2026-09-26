import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.registerWithEmail(dto);
  }

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.validateEmailLogin(dto.email, dto.password);
  }

  // Google and Microsoft OAuth callback routes are wired via
  // @nestjs/passport AuthGuard('google' | 'microsoft') in Phase 2, once
  // redirect URIs are registered against the aggregates.store domain.
}
