import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { AuthGuard } from "../common/auth/auth.guard";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { OAuthService } from "./oauth/oauth.service";

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
 * Six ways to sign in: Email (always on) plus Google, Microsoft, X, Facebook
 * and Instagram, each switched on by its client ID and secret on the API
 * service (docs/sign-in.md). The OAuth flow lives in oauth/oauth.service.ts.
 */
@Global()
@Module({
  imports: [
    JwtModule.register({ secret: authSecret(), signOptions: { expiresIn: "7d" } }),
  ],
  controllers: [AuthController],
  providers: [AuthService, OAuthService, { provide: APP_GUARD, useClass: AuthGuard }],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
