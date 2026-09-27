import { api } from "@/lib/api";
import type { DocumentSummary } from "@/lib/account-types";

/** Public product-level compliance documents, for the product page's Compliance tab. */
export async function GET(_request: Request, { params }: { params: { sku: string } }) {
  const result = await api<DocumentSummary[]>(`/compliance-documents?sku=${encodeURIComponent(params.sku)}`);
  if (!result.ok) return Response.json({ error: result.message }, { status: 502 });
  return Response.json(result.data, { headers: { "Cache-Control": "public, max-age=60" } });
}
