import { api } from "@/lib/api";
import type { NearestDeliveryPoint } from "@/lib/suppliers";

export const dynamic = "force-dynamic";

/**
 * The nearest partner delivery point to the browser's location, for the
 * delivery-areas finder and the product calculator. The location is passed
 * straight through and never stored or logged.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const category = url.searchParams.get("category");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json({ message: "Location required." }, { status: 400 });
  }
  const search = new URLSearchParams({ lat: lat.toFixed(5), lng: lng.toFixed(5) });
  if (category) search.set("category", category);
  const result = await api<NearestDeliveryPoint>(`/suppliers/nearest?${search}`);
  if (!result.ok) {
    return Response.json({ message: result.message }, { status: result.status === 400 ? 400 : 502 });
  }
  return Response.json(result.data, { headers: { "Cache-Control": "no-store" } });
}
