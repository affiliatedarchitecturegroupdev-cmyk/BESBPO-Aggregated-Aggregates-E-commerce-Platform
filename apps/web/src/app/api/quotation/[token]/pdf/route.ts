import { apiRaw } from "@/lib/api";
import { pdfResponse } from "@/lib/pdf-proxy";

/** The client's quotation PDF, from their private link (docs/sales-quotes.md). */
export async function GET(_request: Request, { params }: { params: { token: string } }) {
  return pdfResponse(await apiRaw(`/quotations/view/${encodeURIComponent(params.token)}/pdf`, null), "This quotation link isn't valid any more.");
}
