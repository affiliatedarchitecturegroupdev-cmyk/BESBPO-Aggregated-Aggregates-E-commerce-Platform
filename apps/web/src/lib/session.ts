import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { api } from "./api";

const COOKIE = "aa_session";
const MAX_AGE = 7 * 24 * 60 * 60; // matches the API's token lifetime

export type Role = "CUSTOMER" | "COMPANY_ADMIN" | "STAFF" | "ADMIN";
export type TierName = "RETAIL" | "CONTRACTOR_TRADE" | "VOLUME_CIVIL_BULK";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  company: {
    id: string;
    name: string;
    status: "PENDING" | "APPROVED" | "DECLINED";
    tier: { name: TierName; discountPercent: string };
    requestedTier: { name: TierName } | null;
  } | null;
};

export function sessionToken(): string | null {
  return cookies().get(COOKIE)?.value ?? null;
}

export function startSession(token: string) {
  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function endSession() {
  cookies().delete(COOKIE);
}

/** The signed-in user, or null. Cached per request. */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = sessionToken();
  if (!token) return null;
  const result = await api<SessionUser>("/auth/me", { token });
  return result.ok ? result.data : null;
});

export async function requireSession(returnTo: string): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect(`/account/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}

export const isStaff = (user: SessionUser) => user.role === "STAFF" || user.role === "ADMIN";

/** Only same-site paths are allowed as post-login destinations. */
export function safeReturnPath(value: FormDataEntryValue | string | null | undefined, fallback = "/account/dashboard") {
  const path = typeof value === "string" ? value : "";
  return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\") ? path : fallback;
}
