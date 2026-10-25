import { api } from "@/lib/api";
import { BOT } from "@/lib/search-insights";

export const dynamic = "force-dynamic";

const SLOT = /^(home|department|collection):[a-z0-9]+(?:-[a-z0-9]+)*(?::[a-z0-9]+(?:-[a-z0-9]+)*)?$/;

/**
 * View and click beacons from merchandising sections (docs/search-insights.md), passed to the API. Counts only —
 * nothing about the visitor is stored. Crawlers and link previews aren't counted.
 */
export async function POST(request: Request) {
  if (BOT.test(request.headers.get("user-agent") ?? "")) return new Response(null, { status: 204 });
  let body: { slot?: unknown; type?: unknown };
  try {
    body = JSON.parse(await request.text());
  } catch {
    return new Response(null, { status: 400 });
  }
  const slot = typeof body.slot === "string" && body.slot.length <= 100 && SLOT.test(body.slot) ? body.slot : null;
  const type = body.type === "impression" || body.type === "click" ? body.type : null;
  if (!slot || !type) return new Response(null, { status: 400 });
  await api("/discovery/sections", { method: "POST", body: { slot, type } });
  return new Response(null, { status: 204 });
}
