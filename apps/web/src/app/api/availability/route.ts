import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * "Available near you" for one product (docs/availability.md). The shopper's location is rounded to about a
 * kilometre, passed straight through and never stored or logged.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const sku = url.searchParams.get("sku") ?? "";
  if (!/^[A-Z0-9-]{3,60}$/.test(sku)) return Response.json({ message: "Product required." }, { status: 400 });
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const search = new URLSearchParams({ sku });
  if (url.searchParams.has("lat") && Number.isFinite(lat) && Number.isFinite(lng)) {
    search.set("lat", lat.toFixed(2));
    search.set("lng", lng.toFixed(2));
  }
  const result = await api(`/suppliers/availability?${search}`);
  if (!result.ok) return Response.json({ message: result.message }, { status: result.status === 404 ? 404 : 502 });
  return Response.json(result.data, { headers: { "Cache-Control": "no-store" } });
}
