import { apiRaw } from "@/lib/api";
import { sessionToken } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Streams an applicant's CV. Staff-only: the API checks the forwarded session. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const upstream = await apiRaw(`/careers/admin/applications/${encodeURIComponent(params.id)}/cv`, sessionToken());
  if (!upstream.ok || !upstream.body) {
    const status = upstream.status === 401 || upstream.status === 403 || upstream.status === 404 ? upstream.status : 502;
    return new Response(status === 404 ? "CV not found." : status === 502 ? "Unavailable." : "Staff only.", {
      status,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition": upstream.headers.get("content-disposition") ?? "attachment",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
