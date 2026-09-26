import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-microsoft";
import { OAuthProvider } from "@aggregates/database";
import { AuthService } from "../auth.service";

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, "microsoft") {
  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.MICROSOFT_CLIENT_ID ?? "placeholder-client-id",
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET ?? "placeholder-client-secret",
      callbackURL: `${process.env.NEXT_PUBLIC_APP_URL ?? process.env.RENDER_EXTERNAL_URL ?? "http://localhost:4000"}/api/v1/auth/microsoft/callback`,
      scope: ["user.read"],
    });
  }

  async validate(_accessToken: string, _refreshToken: string, profile: any, done: (err: unknown, user?: unknown) => void) {
    const email = profile.emails?.[0]?.value ?? profile._json?.mail;
    const user = await this.authService.findOrCreateOAuthUser(
      OAuthProvider.MICROSOFT,
      profile.id,
      email,
      profile.displayName,
    );
    done(null, user);
  }
}
