import "server-only";

/** Passes an API PDF response through to the browser, or a short plain-text error. */
export function pdfResponse(upstream: Response, notFound = "Document not found.") {
  if (!upstream.ok || !upstream.body) {
    const status = upstream.status === 401 || upstream.status === 403 ? 403 : upstream.status === 404 ? 404 : 502;
    return new Response(status === 404 ? notFound : status === 403 ? "Please sign in." : "Document unavailable.", { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  const headers = new Headers({ "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" });
  for (const name of ["content-type", "content-length", "content-disposition"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: 200, headers });
}
