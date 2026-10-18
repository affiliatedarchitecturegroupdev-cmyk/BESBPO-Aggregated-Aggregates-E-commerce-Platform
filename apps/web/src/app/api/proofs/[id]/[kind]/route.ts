import { apiRaw } from "@/lib/api";
import { sessionToken } from "@/lib/session";

/** A proof-of-delivery signature or photo. The API decides who may see it (the buyer, staff, or the supplier fulfilling the order). */
export async function GET(_request: Request, { params }: { params: { id: string; kind: string } }) {
  if (params.kind !== "signature" && params.kind !== "photo") return new Response("Not found.", { status: 404 });
  const upstream = await apiRaw(`/deliveries/proofs/${encodeURIComponent(params.id)}/${params.kind}`, sessionToken());
  if (!upstream.ok || !upstream.body) return new Response("Not found.", { status: upstream.status === 404 ? 404 : 502 });
  const type = upstream.headers.get("content-type") ?? "";
  if (!/^image\/(png|jpeg|webp)$/.test(type)) return new Response("Not found.", { status: 404 });
  return new Response(upstream.body, { status: 200, headers: { "Content-Type": type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
