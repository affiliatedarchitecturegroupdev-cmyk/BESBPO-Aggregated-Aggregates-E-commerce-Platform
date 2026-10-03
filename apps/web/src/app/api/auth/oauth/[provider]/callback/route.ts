import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { api } from "@/lib/api";
import { isProvider, LABELS, PENDING_COOKIE, publicOrigin, setShortCookie, STATE_COOKIE } from "@/lib/oauth";
import { safeReturnPath, startSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type Result = { accessToken: string } | { pendingToken: string; provider: string; name: string | null };

/** Where the provider sends the browser back: swaps the code for a session (via the API). */
export async function GET(request: Request, { params }: { params: { provider: string } }) {
  const origin = publicOrigin();
  const url = new URL(request.url);
  const saved = readState();
  cookies().delete(STATE_COOKIE);
  const next = safeReturnPath(saved?.next);
  const back = (message: string) => NextResponse.redirect(`${origin}/account/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent(message)}`, 303);

  if (!isProvider(params.provider)) return back("That sign-in option isn't available.");
  const label = LABELS[params.provider];
  if (url.searchParams.get("error")) return back(`${label} sign-in was cancelled.`);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!saved || saved.provider !== params.provider || !code || !state) return back("Your sign-in took too long or was interrupted. Please try again.");

  const result = await api<Result>(`/auth/oauth/${params.provider}/callback`, { method: "POST", body: { code, state, stateToken: saved.stateToken } });
  if (!result.ok) return back(result.message);
  if ("accessToken" in result.data) {
    startSession(result.data.accessToken);
    return NextResponse.redirect(`${origin}${next}`, 303);
  }
  setShortCookie(PENDING_COOKIE, JSON.stringify({ pendingToken: result.data.pendingToken, provider: params.provider, name: result.data.name }), 1200);
  return NextResponse.redirect(`${origin}/account/complete-sign-up?next=${encodeURIComponent(next)}`, 303);
}

function readState(): { stateToken: string; next: string; provider: string } | null {
  try {
    const value = JSON.parse(cookies().get(STATE_COOKIE)?.value ?? "null");
    return value && typeof value.stateToken === "string" ? value : null;
  } catch {
    return null;
  }
}
