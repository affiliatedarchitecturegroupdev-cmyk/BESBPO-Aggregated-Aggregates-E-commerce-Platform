import { apiRaw } from "@/lib/api";
import { sessionToken } from "@/lib/session";

/**
 * Serves a compliance document to the browser. The API decides visibility:
 * product documents are public; order documents need the buyer's (or
 * staff's) session, which is forwarded from our cookie.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const upstream = await apiRaw(`/compliance-documents/${encodeURIComponent(params.id)}/file`, sessionToken());
  if (!upstream.ok || !upstream.body) {
    return new Response(upstream.status === 404 ? "Document not found." : "Document unavailable.", {
      status: upstream.status === 404 ? 404 : 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const headers = new Headers({ "X-Content-Type-Options": "nosniff" });
  for (const name of ["content-type", "content-length", "content-disposition", "cache-control"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: 200, headers });
}
