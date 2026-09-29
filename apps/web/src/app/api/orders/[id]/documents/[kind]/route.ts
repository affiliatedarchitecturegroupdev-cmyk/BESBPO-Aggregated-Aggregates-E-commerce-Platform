import { apiRaw } from "@/lib/api";
import { sessionToken } from "@/lib/session";

const KINDS = new Set(["confirmation", "delivery-note", "invoice"]);

/**
 * Streams an order's PDF (order confirmation, delivery note or tax invoice)
 * to the browser. The API checks the buyer's — or staff's — session, which
 * is forwarded from our cookie.
 */
export async function GET(_request: Request, { params }: { params: { id: string; kind: string } }) {
  if (!KINDS.has(params.kind)) return new Response("Unknown document.", { status: 404 });
  const upstream = await apiRaw(`/orders/${encodeURIComponent(params.id)}/documents/${params.kind}`, sessionToken());
  if (!upstream.ok || !upstream.body) {
    const status = upstream.status === 401 ? 401 : upstream.status === 404 ? 404 : 502;
    return new Response(status === 401 ? "Please sign in to download this document." : status === 404 ? "Document not available." : "Document unavailable.", {
      status,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const headers = new Headers({ "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" });
  for (const name of ["content-type", "content-length", "content-disposition"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: 200, headers });
}
