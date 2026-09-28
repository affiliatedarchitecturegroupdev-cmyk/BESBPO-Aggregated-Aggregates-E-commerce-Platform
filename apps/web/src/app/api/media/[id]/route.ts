import { apiRaw } from "@/lib/api";

/** Staff-uploaded promotion and blog images, streamed from the API with long-lived caching (ids never change content). */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  if (!/^[a-z0-9]{10,40}$/.test(params.id)) return new Response("Image not found.", { status: 404 });
  const upstream = await apiRaw(`/media/${encodeURIComponent(params.id)}`, null);
  if (!upstream.ok || !upstream.body) {
    return new Response("Image not found.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
