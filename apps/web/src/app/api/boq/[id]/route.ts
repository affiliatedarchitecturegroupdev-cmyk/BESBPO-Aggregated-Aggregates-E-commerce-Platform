import { apiRaw } from "@/lib/api";
import { sessionToken } from "@/lib/session";

/** The bill of quantities attached to a quote request — for the requester or staff (the API checks). Always downloaded, never shown inline. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const upstream = await apiRaw(`/boq/quotes/${encodeURIComponent(params.id)}/file`, sessionToken());
  if (!upstream.ok || !upstream.body) return new Response("Not found.", { status: upstream.status === 404 ? 404 : 502 });
  const headers = new Headers({ "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" });
  for (const name of ["content-type", "content-length", "content-disposition"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: 200, headers });
}
