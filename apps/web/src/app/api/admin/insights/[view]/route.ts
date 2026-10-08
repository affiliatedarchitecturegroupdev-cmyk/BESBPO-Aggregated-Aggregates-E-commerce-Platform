import { apiRaw } from "@/lib/api";
import { apiQuery, readFilters, resolveRange } from "@/lib/insights";
import { sessionToken } from "@/lib/session";

export const dynamic = "force-dynamic";

const VIEWS = ["timeseries", "breakdown", "pnl"] as const;
const PASS = { breakdown: ["by", "sort", "limit"], pnl: ["months"], timeseries: [] } as const;

/**
 * CSV downloads for Insights tables. The page's filters (presets included)
 * are resolved exactly as the page resolves them; the API checks the
 * forwarded session and removes cost and profit columns for staff.
 */
export async function GET(request: Request, { params }: { params: { view: string } }) {
  const view = VIEWS.find((v) => v === params.view);
  if (!view) return new Response("Not found.", { status: 404 });
  const url = new URL(request.url);
  const f = readFilters(Object.fromEntries(url.searchParams));
  const extra: Record<string, string> = { format: "csv" };
  for (const key of PASS[view]) {
    const v = url.searchParams.get(key);
    if (v) extra[key] = v.slice(0, 40);
  }
  const query = view === "pnl" ? new URLSearchParams({ to: resolveRange(f).to, ...extra }).toString() : apiQuery(f, extra);
  const upstream = await apiRaw(`/insights/${view}?${query}`, sessionToken());
  if (!upstream.ok || !upstream.body) {
    const status = [400, 401, 403].includes(upstream.status) ? upstream.status : 502;
    return new Response(status === 502 ? "Export unavailable." : status === 400 ? "Check the filters and try again." : "Not allowed.", {
      status,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": upstream.headers.get("content-disposition") ?? `attachment; filename="insights-${view}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
