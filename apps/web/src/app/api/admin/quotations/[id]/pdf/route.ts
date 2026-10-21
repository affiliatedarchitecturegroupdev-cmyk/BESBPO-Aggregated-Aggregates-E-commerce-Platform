import { apiRaw } from "@/lib/api";
import { pdfResponse } from "@/lib/pdf-proxy";
import { sessionToken } from "@/lib/session";

/** Staff: a sales quotation's PDF (docs/sales-quotes.md), with the staff session forwarded. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return pdfResponse(await apiRaw(`/quotations/${encodeURIComponent(params.id)}/pdf`, sessionToken()), "Quotation not found.");
}
