import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthGuard } from "../common/auth/auth.guard";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { GoogleStrategy } from "./strategies/google.strategy";
import { MicrosoftStrategy } from "./strategies/microsoft.strategy";

function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret) return secret;
  if (process.env.RENDER) {
    // render.yaml generates AUTH_SECRET; never fall back to a known value in a deployment.
    throw new Error("AUTH_SECRET is not set.");
  }
  return "local-development-only-secret";
}

/**
 * Confirmed SSO set (per the feature adoption matrix): Email + Google +
 * Microsoft — reduced from the generic blueprint's 6-option SSO because
 * this buyer base (contractors, civil buyers) skews B2B; consumer-social
 * logins are low-value here. Email sign-in is live; the Google and
 * Microsoft strategies are registered but their routes wait on OAuth client
 * credentials (docs/deployment/render.md).
 */
@Global()
@Module({
  imports: [
    PassportModule,
    JwtModule.register({ secret: authSecret(), signOptions: { expiresIn: "7d" } }),
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, MicrosoftStrategy, { provide: APP_GUARD, useClass: AuthGuard }],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
