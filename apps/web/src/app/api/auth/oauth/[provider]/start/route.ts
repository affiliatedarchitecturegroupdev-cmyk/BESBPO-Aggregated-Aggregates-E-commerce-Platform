import { NextResponse } from "next/server";
import { api } from "@/lib/api";
import { isProvider, publicOrigin, setShortCookie, STATE_COOKIE } from "@/lib/oauth";
import { safeReturnPath } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Starts "Continue with Google / Microsoft / X / Facebook / Instagram": asks
 * the API for the provider's sign-in URL, keeps the signed state token in a
 * short-lived httpOnly cookie, and sends the browser to the provider.
 */
export async function GET(request: Request, { params }: { params: { provider: string } }) {
  const origin = publicOrigin();
  const next = safeReturnPath(new URL(request.url).searchParams.get("next"));
  const back = (message: string) => NextResponse.redirect(`${origin}/account/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent(message)}`, 303);
  if (!isProvider(params.provider)) return back("That sign-in option isn't available.");

  const redirectUri = `${origin}/api/auth/oauth/${params.provider}/callback`;
  const result = await api<{ url: string; stateToken: string }>(`/auth/oauth/${params.provider}/start`, { method: "POST", body: { redirectUri } });
  if (!result.ok) return back(result.message);
  setShortCookie(STATE_COOKIE, JSON.stringify({ stateToken: result.data.stateToken, next, provider: params.provider }), 600);
  return NextResponse.redirect(result.data.url, 303);
}
