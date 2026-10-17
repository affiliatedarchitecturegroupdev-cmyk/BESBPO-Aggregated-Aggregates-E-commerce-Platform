import { apiRaw } from "@/lib/api";

/** The proforma invoice behind a payment link — no sign-in, the link is the key. */
export async function GET(_request: Request, { params }: { params: { token: string } }) {
  const upstream = await apiRaw(`/payment-links/${encodeURIComponent(params.token)}/proforma`, null);
  if (!upstream.ok || !upstream.body) {
    return new Response(upstream.status === 404 || upstream.status === 400 ? "This payment link isn't valid any more." : "Document unavailable.", {
      status: upstream.status === 404 || upstream.status === 400 ? 404 : 502,
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
