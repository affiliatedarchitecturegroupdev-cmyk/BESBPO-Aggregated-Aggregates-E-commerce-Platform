import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { GoogleStrategy } from "./strategies/google.strategy";
import { MicrosoftStrategy } from "./strategies/microsoft.strategy";

/**
 * Confirmed SSO set (per the feature adoption matrix): Email + Google +
 * Microsoft — reduced from the generic blueprint's 6-option SSO because
 * this buyer base (contractors, civil buyers) skews B2B; consumer-social
 * logins are low-value here.
 */
@Module({
  imports: [PassportModule],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, MicrosoftStrategy],
  exports: [AuthService],
})
export class AuthModule {}
