import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-google-oauth20";
import { OAuthProvider } from "@aggregates/database";
import { AuthService } from "../auth.service";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID ?? "placeholder-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "placeholder-client-secret",
      callbackURL: `${process.env.NEXT_PUBLIC_APP_URL ?? process.env.RENDER_EXTERNAL_URL ?? "http://localhost:4000"}/api/v1/auth/google/callback`,
      scope: ["email", "profile"],
    });
  }

  async validate(_accessToken: string, _refreshToken: string, profile: any, done: VerifyCallback) {
    const email = profile.emails?.[0]?.value;
    const user = await this.authService.findOrCreateOAuthUser(
      OAuthProvider.GOOGLE,
      profile.id,
      email,
      profile.displayName,
    );
    done(null, user);
  }
}
