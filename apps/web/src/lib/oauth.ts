import "server-only";
import { cookies, headers } from "next/headers";
import { apiCached } from "./api";

export type OAuthProviderKey = "google" | "microsoft" | "x" | "facebook" | "instagram";
export type OAuthProviderInfo = { provider: OAuthProviderKey; label: string; enabled: boolean };

/** Sign-in buttons, in display order. Email is the sixth option (the form). */
export const OAUTH_ORDER: OAuthProviderKey[] = ["google", "microsoft", "x", "facebook", "instagram"];

export const STATE_COOKIE = "aa_oauth";
export const PENDING_COOKIE = "aa_oauth_pending";

/** Which providers the API has credentials for. Unknown (API down) means none. */
export async function oauthProviders(): Promise<OAuthProviderInfo[]> {
  const list = (await apiCached<OAuthProviderInfo[]>("/auth/oauth/providers", 300)) ?? [];
  const byKey = new Map(list.map((p) => [p.provider, p]));
  return OAUTH_ORDER.map((key) => byKey.get(key) ?? { provider: key, label: LABELS[key], enabled: false });
}

export const LABELS: Record<OAuthProviderKey, string> = {
  google: "Google",
  microsoft: "Microsoft",
  x: "X",
  facebook: "Facebook",
  instagram: "Instagram",
};

export const isProvider = (value: string): value is OAuthProviderKey => (OAUTH_ORDER as string[]).includes(value);

/** The storefront's public origin (Render terminates TLS in front of us). */
export function publicOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto.split(",")[0]}://${host.split(",")[0]}`;
}

export function setShortCookie(name: string, value: string, maxAgeSeconds: number) {
  cookies().set(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}
