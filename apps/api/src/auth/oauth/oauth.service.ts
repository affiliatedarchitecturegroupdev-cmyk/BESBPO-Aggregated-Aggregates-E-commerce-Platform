import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomBytes } from "node:crypto";
import { UserRole } from "@aggregates/database";
import { PrismaService } from "../../common/prisma.service";
import { AuthService } from "../auth.service";
import { OAUTH_PROVIDERS, OAuthProfile, OAuthProviderConfig, providerConfig, providerCredentials } from "./oauth-providers";

type StateClaims = { kind: "oauth-state"; provider: string; nonce: string; verifier: string | null; redirectUri: string };
type PendingClaims = { kind: "oauth-pending"; provider: string; providerAccountId: string; name: string | null };

export type OAuthResult = { accessToken: string } | { pendingToken: string; provider: string; name: string | null };

const base64url = (buffer: Buffer) => buffer.toString("base64url");

/**
 * Authorization-code sign-in for Google, Microsoft, Facebook, X and Instagram.
 *
 * The storefront drives it (the browser never talks to the API): it asks for
 * an authorize URL, keeps the signed state token in an httpOnly cookie while
 * the person is at the provider, then hands back the code with that token.
 *
 * Accounts are linked by email only when the provider vouches for the email;
 * otherwise an existing account with that email is never taken over. A
 * provider that shares no email (Instagram, sometimes X) gets a short-lived
 * pending token, and the person adds an email address to finish.
 */
@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  providers() {
    return Object.values(OAUTH_PROVIDERS).map((p) => ({ provider: p.key, label: p.label, enabled: providerCredentials(p) !== null }));
  }

  async start(key: string, redirectUri: string) {
    const config = this.config(key);
    const credentials = this.credentials(config);
    this.checkRedirectUri(config, redirectUri);
    const nonce = base64url(randomBytes(24));
    const verifier = config.pkce ? base64url(randomBytes(48)) : null;
    const params = new URLSearchParams({
      client_id: credentials.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: config.scope,
      state: nonce,
      ...(verifier ? { code_challenge: base64url(createHash("sha256").update(verifier).digest()), code_challenge_method: "S256" } : {}),
      ...config.extraAuthorizeParams,
    });
    const claims: StateClaims = { kind: "oauth-state", provider: config.key, nonce, verifier, redirectUri };
    return { url: `${config.authorizeUrl}?${params}`, stateToken: await this.jwt.signAsync(claims, { expiresIn: "10m" }) };
  }

  async callback(key: string, input: { code: string; state: string; stateToken: string }): Promise<OAuthResult> {
    const config = this.config(key);
    const credentials = this.credentials(config);
    const state = await this.verify<StateClaims>(input.stateToken, "oauth-state");
    if (state.provider !== config.key || state.nonce !== input.state) throw new BadRequestException("This sign-in link has expired. Please try again.");

    const body = new URLSearchParams({ grant_type: "authorization_code", code: input.code, redirect_uri: state.redirectUri });
    if (state.verifier) body.set("code_verifier", state.verifier);
    const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" };
    if (config.tokenAuth === "basic") {
      headers.Authorization = `Basic ${Buffer.from(`${encodeURIComponent(credentials.clientId)}:${encodeURIComponent(credentials.clientSecret)}`).toString("base64")}`;
      body.set("client_id", credentials.clientId);
    } else {
      body.set("client_id", credentials.clientId);
      body.set("client_secret", credentials.clientSecret);
    }

    let profile: OAuthProfile;
    try {
      const response = await fetch(config.tokenUrl, { method: "POST", headers, body, signal: AbortSignal.timeout(10_000) });
      const token = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok || typeof token.access_token !== "string") throw new Error(`token exchange failed (${response.status})`);
      profile = await config.profile(token.access_token, token);
    } catch (error) {
      this.logger.warn(`${config.label} sign-in failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException(`${config.label} sign-in didn't complete. Please try again.`);
    }
    if (!profile.id || profile.id === "undefined") throw new BadRequestException(`${config.label} didn't return an account ID.`);
    return this.signIn(config, profile);
  }

  /** Links a provider account to a session (or a new account); see the class comment for the email rules. */
  async signIn(config: OAuthProviderConfig, profile: OAuthProfile): Promise<OAuthResult> {
    const link = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider: config.provider, providerAccountId: profile.id } },
    });
    if (link) return { accessToken: await this.auth.issueToken(link.userId) };

    if (!profile.email) {
      const claims: PendingClaims = { kind: "oauth-pending", provider: config.key, providerAccountId: profile.id, name: profile.name };
      return { pendingToken: await this.jwt.signAsync(claims, { expiresIn: "20m" }), provider: config.key, name: profile.name };
    }

    const email = profile.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing && !profile.emailVerified) {
      throw new ConflictException(
        `An account already uses ${email}. Sign in with your email and password — ${config.label} can't be linked to it automatically.`,
      );
    }
    const user = existing ?? (await this.prisma.user.create({ data: { email, name: profile.name, role: UserRole.CUSTOMER } }));
    await this.prisma.oAuthAccount.create({ data: { provider: config.provider, providerAccountId: profile.id, userId: user.id } });
    return { accessToken: await this.auth.issueToken(user.id) };
  }

  /** Finishes a sign-up from a provider that shared no email address. */
  async complete(pendingToken: string, rawEmail: string, name?: string) {
    const pending = await this.verify<PendingClaims>(pendingToken, "oauth-pending");
    const config = this.config(pending.provider);
    const email = rawEmail.trim().toLowerCase();
    const already = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider: config.provider, providerAccountId: pending.providerAccountId } },
    });
    if (already) return { accessToken: await this.auth.issueToken(already.userId) };
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException(`An account already uses ${email}. Sign in with your email and password instead.`);
    }
    const user = await this.prisma.user.create({
      data: {
        email,
        name: name?.trim() || pending.name,
        role: UserRole.CUSTOMER,
        oauthAccounts: { create: { provider: config.provider, providerAccountId: pending.providerAccountId } },
      },
    });
    return { accessToken: await this.auth.issueToken(user.id) };
  }

  private config(key: string) {
    const config = providerConfig(key);
    if (!config) throw new NotFoundException("Unknown sign-in provider.");
    return config;
  }

  private credentials(config: OAuthProviderConfig) {
    const credentials = providerCredentials(config);
    if (!credentials) throw new ServiceUnavailableException(`${config.label} sign-in isn't switched on yet.`);
    return credentials;
  }

  /** Only our own storefront callback, over HTTPS (or localhost in development). */
  private checkRedirectUri(config: OAuthProviderConfig, redirectUri: string) {
    let url: URL;
    try {
      url = new URL(redirectUri);
    } catch {
      throw new BadRequestException("Invalid redirect URI.");
    }
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if ((url.protocol !== "https:" && !local) || url.pathname !== `/api/auth/oauth/${config.key}/callback` || url.search || url.hash) {
      throw new BadRequestException("Invalid redirect URI.");
    }
  }

  private async verify<T extends { kind: string }>(token: string, kind: T["kind"]): Promise<T> {
    try {
      const claims = await this.jwt.verifyAsync<T>(token);
      if (claims.kind === kind) return claims;
    } catch {
      // fall through
    }
    throw new BadRequestException("This sign-in link has expired. Please try again.");
  }
}
