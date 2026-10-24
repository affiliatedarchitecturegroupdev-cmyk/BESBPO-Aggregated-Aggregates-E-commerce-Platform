import Link from "next/link";
import { api } from "@/lib/api";
import { formatZAR } from "@/lib/pricing";
import { QUOTE_STATUS_LABEL, type QuotationListRow } from "@/lib/quotations";
import { sessionToken } from "@/lib/session";

export const metadata = { title: "Quotations" };

const FILTERS = [
  { key: "", label: "All" },
  { key: "DRAFT", label: "Drafts" },
  { key: "QUOTED", label: "Sent" },
  { key: "ACCEPTED", label: "Accepted" },
  { key: "DECLINED", label: "Declined" },
  { key: "EXPIRED", label: "Expired" },
] as const;

const day = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Johannesburg" });

/**
 * Staff: sales quotations (docs/sales-quotes.md) — formal, numbered quotes
 * for clients who come in by WhatsApp, social media or phone. Storefront
 * quote requests stay under Quote requests.
 */
export default async function AdminQuotationsPage({ searchParams }: { searchParams: { status?: string } }) {
  const status = FILTERS.find((f) => f.key === searchParams.status)?.key ?? "";
  const result = await api<QuotationListRow[]>(`/quotations${status ? `?status=${status}` : ""}`, { token: sessionToken() });
  if (!result.ok) return <p className="font-body text-sm text-slate">{result.message}</p>;
  const rows = result.data;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <h2 className="font-display text-xl font-bold text-basalt">Quotations</h2>
          <p className="mt-1 font-body text-sm text-slate">
            Formal quotations for clients: any product, at its list price, a supplier&apos;s cost plus markup, or a price you set. Send it by email with
            the PDF, or share the link on WhatsApp — the client views it, downloads the PDF, and accepts and pays online.
          </p>
        </div>
        <Link href="/admin/quotations/new" className="rounded-sm bg-seam-blue px-4 py-2 font-body text-sm font-semibold text-limestone hover:bg-basalt">
          New quotation
        </Link>
      </div>
      <nav className="flex flex-wrap gap-2 font-body text-sm" aria-label="Filter quotations">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/admin/quotations?status=${f.key}` : "/admin/quotations"}
            className={`rounded-sm border px-3 py-1 ${f.key === status ? "border-seam-blue bg-seam-blue text-limestone" : "border-basalt/20 bg-white text-basalt hover:border-seam-blue"}`}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <p className="font-body text-sm text-slate">No quotations here yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-basalt/10 bg-white">
          <table className="w-full min-w-[760px] font-body text-sm">
            <thead className="bg-limestone text-left text-xs text-slate">
              <tr>
                <th className="p-2">Quotation</th>
                <th className="p-2">Client</th>
                <th className="p-2 text-right">Total</th>
                <th className="p-2">Status</th>
                <th className="p-2">Valid until</th>
                <th className="p-2">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-basalt/5">
              {rows.map((q) => (
                <tr key={q.id} className="hover:bg-limestone/50">
                  <td className="p-2">
                    <Link href={`/admin/quotations/${q.id}`} className="font-semibold text-seam-blue hover:underline">
                      {q.quoteNumber ?? "Draft"}
                    </Link>
                    <span className="block text-[11px] text-slate">
                      {day(q.createdAt)} · {q._count.lineItems} line{q._count.lineItems === 1 ? "" : "s"}
                    </span>
                  </td>
                  <td className="p-2">
                    {q.companyName ?? q.contactName}
                    {q.companyName && q.contactName && <span className="block text-[11px] text-slate">{q.contactName}</span>}
                  </td>
                  <td className="p-2 text-right tabular-nums">{q.quotedTotal !== null ? formatZAR(Number(q.quotedTotal)) : "—"}</td>
                  <td className="p-2">
                    {QUOTE_STATUS_LABEL[q.status]}
                    {q.order && <span className="block text-[11px] text-slate">Order {q.order.orderNumber}</span>}
                  </td>
                  <td className="p-2">{q.validUntil ? day(q.validUntil) : "—"}</td>
                  <td className="p-2 text-slate">{q.createdBy?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
