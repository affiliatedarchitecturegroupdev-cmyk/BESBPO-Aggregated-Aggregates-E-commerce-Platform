import { assistantEngine, type AssistantCartLine, type AssistantState } from "@/lib/assistant";
import { productBySlug } from "@/lib/assistant/knowledge";
import { getVatRegistered } from "@/lib/tax";
import { getHiddenSkus } from "@/lib/cms";

export const dynamic = "force-dynamic";

const MAX_MESSAGE = 500;
const WINDOW_MS = 60_000;
const PER_WINDOW = 30;
const hits = new Map<string, { count: number; reset: number }>();

/** A simple per-address limit so the endpoint can't be hammered; resets each minute. */
function limited(ip: string): boolean {
  const now = Date.now();
  if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  const entry = hits.get(ip);
  if (!entry || entry.reset < now) {
    hits.set(ip, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > PER_WINDOW;
}

function cartFrom(value: unknown): AssistantCartLine[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 30)
    .filter(
      (l): l is AssistantCartLine =>
        !!l &&
        typeof l.sku === "string" &&
        /^[A-Za-z0-9-]{2,60}$/.test(l.sku) &&
        typeof l.unit === "string" &&
        /^[A-Za-z0-9_]{1,30}$/.test(l.unit) &&
        typeof l.quantity === "number" &&
        l.quantity > 0 &&
        l.quantity <= 100000,
    )
    .map((l) => ({ sku: l.sku, unit: l.unit, quantity: l.quantity }));
}

function stateFrom(value: unknown): AssistantState {
  const v = (value ?? {}) as Record<string, unknown>;
  const state: AssistantState = {};
  if (v.pending === "volume" || v.pending === "wall" || v.pending === "paving" || v.pending === "rebar") state.pending = v.pending;
  if (typeof v.sku === "string" && /^[A-Za-z0-9-]{2,60}$/.test(v.sku)) state.sku = v.sku;
  if (typeof v.volumeM3 === "number" && v.volumeM3 > 0 && v.volumeM3 < 100000) state.volumeM3 = v.volumeM3;
  return state;
}

/**
 * The shopping assistant (SHOPPING_ASSISTANT.md). Answers a question from the
 * store's own data with the page and cart as context. Questions aren't
 * stored or logged, and nothing is sent to any outside service.
 */
export async function POST(request: Request) {
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (limited(ip)) return Response.json({ error: "Too many questions at once — try again in a minute." }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.slice(0, MAX_MESSAGE) : "";
  const path = typeof body.path === "string" && body.path.startsWith("/") ? body.path.slice(0, 200) : "/";

  const [hiddenSkus, vatRegistered] = await Promise.all([getHiddenSkus().catch(() => [] as string[]), getVatRegistered()]);
  const slug = path.match(/^\/products\/([a-z0-9-]+)/)?.[1];
  const onPage = slug ? productBySlug(slug) : undefined;
  const state = stateFrom(body.state);
  if (state.sku && hiddenSkus.includes(state.sku)) delete state.sku;

  const reply = await assistantEngine().respond(
    message,
    { path, sku: onPage && !hiddenSkus.includes(onPage.sku) ? onPage.sku : null, cart: cartFrom(body.cart), hiddenSkus, vatRegistered },
    state,
  );
  return Response.json(reply, { headers: { "Cache-Control": "no-store" } });
}
