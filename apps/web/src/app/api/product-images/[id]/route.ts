import { apiRaw } from "@/lib/api";
import { sessionToken } from "@/lib/session";

/**
 * Product photography, streamed from the API. The session is forwarded so
 * staff can preview photos still awaiting permission; the API decides who
 * may see each photo and how long it may be cached.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const upstream = await apiRaw(`/merchandising/images/${encodeURIComponent(params.id)}`, sessionToken());
  if (!upstream.ok || !upstream.body) {
    return new Response("Image not found.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "Cache-Control": upstream.headers.get("cache-control") ?? "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
