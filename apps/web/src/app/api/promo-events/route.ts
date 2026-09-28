import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|whatsapp/i;

/**
 * Impression and click beacons from promotion slots, passed to the API.
 * Counts only — nothing about the visitor is stored. Crawlers and link
 * previews aren't counted.
 */
export async function POST(request: Request) {
  if (BOT.test(request.headers.get("user-agent") ?? "")) return new Response(null, { status: 204 });
  let body: { id?: unknown; type?: unknown };
  try {
    body = JSON.parse(await request.text());
  } catch {
    return new Response(null, { status: 400 });
  }
  const id = typeof body.id === "string" && /^[a-z0-9]{10,40}$/.test(body.id) ? body.id : null;
  const type = body.type === "impression" || body.type === "click" ? body.type : null;
  if (!id || !type) return new Response(null, { status: 400 });
  await api(`/promotions/${id}/events`, { method: "POST", body: { type } });
  return new Response(null, { status: 204 });
}
