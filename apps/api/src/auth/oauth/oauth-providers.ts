import { OAuthProvider } from "@aggregates/database";

/**
 * The five social / work sign-in providers (Email is the sixth option). Each
 * is switched on by setting its client ID and secret on the API service —
 * until then its button shows as "coming soon". See docs/sign-in.md for where
 * to register each app and which redirect URI to give it.
 */
export type OAuthProfile = {
  id: string;
  email: string | null;
  /** True only when the provider vouches that the user controls the email. */
  emailVerified: boolean;
  name: string | null;
};

export type OAuthProviderConfig = {
  key: OAuthProviderKey;
  provider: OAuthProvider;
  label: string;
  envPrefix: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  pkce: boolean;
  /** "basic": client credentials in an Authorization header; "body": in the form body. */
  tokenAuth: "basic" | "body";
  extraAuthorizeParams?: Record<string, string>;
  profile(accessToken: string, tokenResponse: Record<string, unknown>): Promise<OAuthProfile>;
};

export type OAuthProviderKey = "google" | "microsoft" | "facebook" | "x" | "instagram";

async function getJson(url: string, accessToken?: string): Promise<Record<string, any>> {
  const response = await fetch(url, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } : { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Profile request failed (${response.status}).`);
  return (await response.json()) as Record<string, any>;
}

const str = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);

export const OAUTH_PROVIDERS: Record<OAuthProviderKey, OAuthProviderConfig> = {
  google: {
    key: "google",
    provider: OAuthProvider.GOOGLE,
    label: "Google",
    envPrefix: "GOOGLE",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
    pkce: true,
    tokenAuth: "body",
    extraAuthorizeParams: { prompt: "select_account" },
    async profile(token) {
      const p = await getJson("https://openidconnect.googleapis.com/v1/userinfo", token);
      return { id: String(p.sub), email: str(p.email), emailVerified: p.email_verified === true, name: str(p.name) };
    },
  },
  microsoft: {
    key: "microsoft",
    provider: OAuthProvider.MICROSOFT,
    label: "Microsoft",
    envPrefix: "MICROSOFT",
    authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope: "openid email profile User.Read",
    pkce: true,
    tokenAuth: "body",
    extraAuthorizeParams: { prompt: "select_account" },
    async profile(token) {
      const p = await getJson("https://graph.microsoft.com/oidc/userinfo", token);
      // Microsoft's email claim isn't verified for every account type, so it
      // never links to an existing account on its own (it can still sign up).
      return { id: String(p.sub), email: str(p.email), emailVerified: false, name: str(p.name) };
    },
  },
  facebook: {
    key: "facebook",
    provider: OAuthProvider.FACEBOOK,
    label: "Facebook",
    envPrefix: "FACEBOOK",
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scope: "email public_profile",
    pkce: false,
    tokenAuth: "body",
    async profile(token) {
      const p = await getJson(`https://graph.facebook.com/v21.0/me?fields=id,name,email&access_token=${encodeURIComponent(token)}`);
      // Facebook only returns an email address the person has confirmed.
      return { id: String(p.id), email: str(p.email), emailVerified: Boolean(str(p.email)), name: str(p.name) };
    },
  },
  x: {
    key: "x",
    provider: OAuthProvider.X,
    label: "X",
    envPrefix: "X",
    authorizeUrl: "https://x.com/i/oauth2/authorize",
    tokenUrl: "https://api.x.com/2/oauth2/token",
    scope: "users.read tweet.read users.email",
    pkce: true,
    tokenAuth: "basic",
    async profile(token) {
      const p = await getJson("https://api.x.com/2/users/me?user.fields=confirmed_email,name", token);
      const email = str(p.data?.confirmed_email);
      return { id: String(p.data?.id), email, emailVerified: Boolean(email), name: str(p.data?.name) };
    },
  },
  instagram: {
    key: "instagram",
    provider: OAuthProvider.INSTAGRAM,
    label: "Instagram",
    envPrefix: "INSTAGRAM",
    authorizeUrl: "https://www.instagram.com/oauth/authorize",
    tokenUrl: "https://api.instagram.com/oauth/access_token",
    scope: "instagram_business_basic",
    pkce: false,
    tokenAuth: "body",
    async profile(token, tokenResponse) {
      const p = await getJson(`https://graph.instagram.com/me?fields=user_id,username,name&access_token=${encodeURIComponent(token)}`);
      // Instagram never shares an email address; the person adds one to finish signing up.
      return { id: String(p.user_id ?? p.id ?? tokenResponse.user_id), email: null, emailVerified: false, name: str(p.name) ?? str(p.username) };
    },
  },
};

export function providerConfig(key: string): OAuthProviderConfig | null {
  return Object.prototype.hasOwnProperty.call(OAUTH_PROVIDERS, key) ? OAUTH_PROVIDERS[key as OAuthProviderKey] : null;
}

export function providerCredentials(config: OAuthProviderConfig) {
  const clientId = process.env[`${config.envPrefix}_CLIENT_ID`];
  const clientSecret = process.env[`${config.envPrefix}_CLIENT_SECRET`];
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}
