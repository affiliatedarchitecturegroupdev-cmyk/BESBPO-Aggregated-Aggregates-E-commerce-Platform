import { apiRaw } from "@/lib/api";
import { sessionToken } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Downloads the newsletter subscribers CSV. Staff-only: the API checks the forwarded session. */
export async function GET() {
  const upstream = await apiRaw("/newsletter/admin/export.csv", sessionToken());
  if (!upstream.ok || !upstream.body) {
    const status = upstream.status === 401 || upstream.status === 403 ? upstream.status : 502;
    return new Response(status === 502 ? "Export unavailable." : "Staff only.", {
      status,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="newsletter-subscribers.csv"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
