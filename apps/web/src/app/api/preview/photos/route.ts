import { draftMode } from "next/headers";
import { NextResponse } from "next/server";
import { getSession, isStaff, safeReturnPath } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Turns the staff photo preview on (?on) or off (?off) for this browser only,
 * then returns to `next`. Only a signed-in staff member can turn it on; the
 * API still checks the session on every photo, so the preview cookie on its
 * own reveals nothing.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeReturnPath(url.searchParams.get("next"), "/products");
  if (url.searchParams.has("off")) {
    draftMode().disable();
    return NextResponse.redirect(new URL(next, url));
  }
  const user = await getSession();
  if (!user) return NextResponse.redirect(new URL(`/account/login?next=${encodeURIComponent("/admin/image-permissions")}`, url));
  // Customers just carry on to the store — the preview is staff-only.
  if (!isStaff(user)) return NextResponse.redirect(new URL(next, url));
  draftMode().enable();
  return NextResponse.redirect(new URL(next, url));
}
