import Link from "next/link";
import { notFound } from "next/navigation";
import { QuotationEditor } from "@/components/admin/QuotationEditor";
import { QuotationSendPanel } from "@/components/admin/QuotationSendPanel";
import { api } from "@/lib/api";
import { formatZAR } from "@/lib/pricing";
import { QUOTE_STATUS_LABEL, type SalesQuotation } from "@/lib/quotations";
import { sessionToken } from "@/lib/session";
import { getVatRegistered } from "@/lib/tax";
import { duplicateQuotation } from "../actions";

export const metadata = { title: "Quotation" };

const when = (iso: string) => new Date(iso).toLocaleString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg" });

export default async function AdminQuotationPage({ params }: { params: { id: string } }) {
  const [result, vatRegistered] = await Promise.all([api<SalesQuotation>(`/quotations/${encodeURIComponent(params.id)}`, { token: sessionToken() }), getVatRegistered()]);
  if (!result.ok) {
    if (result.status === 404) notFound();
    return <p className="font-body text-sm text-slate">{result.message}</p>;
  }
  const q = result.data;
  const answered = Boolean(q.order) || q.status === "ACCEPTED" || q.status === "DECLINED";
  return (
    <div className="space-y-5">
      <Link href="/admin/quotations" className="font-body text-sm text-seam-blue hover:underline">
        ← Quotations
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-basalt">
            {q.quoteNumber ?? "Draft quotation"} <span className="ml-2 rounded-sm bg-limestone px-2 py-0.5 font-mono text-xs text-slate">{QUOTE_STATUS_LABEL[q.status]}</span>
          </h2>
          <p className="mt-1 font-body text-xs text-slate">
            {q.client.companyName ?? q.client.name} · {formatZAR(q.totals.total)}
            {q.validUntil ? ` · valid until ${when(q.validUntil)}` : ""}
            {q.sentAt ? ` · emailed ${when(q.sentAt)}` : ""}
            {q.respondedAt ? ` · answered ${when(q.respondedAt)}` : ""}
            {q.createdBy?.name ? ` · by ${q.createdBy.name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/admin/quotations/${q.id}/pdf`} className="rounded-sm border border-basalt/20 bg-white px-3 py-2 font-body text-sm font-semibold text-basalt hover:border-seam-blue">
            Download PDF
          </a>
          <form action={duplicateQuotation}>
            <input type="hidden" name="id" value={q.id} />
            <button type="submit" className="rounded-sm border border-basalt/20 bg-white px-3 py-2 font-body text-sm font-semibold text-basalt hover:border-seam-blue">
              Duplicate
            </button>
          </form>
        </div>
      </div>

      {q.order ? (
        <div className="rounded-sm border border-seam-blue/30 bg-seam-blue/5 p-4 font-body text-sm text-basalt">
          The client accepted: order{" "}
          <Link href={`/admin/orders/${q.order.id}/payments`} className="font-semibold text-seam-blue hover:underline">
            {q.order.orderNumber}
          </Link>{" "}
          ({formatZAR(Number(q.order.total))}, {Number(q.order.amountPaid) >= Number(q.order.total) - 0.01 ? "paid" : `${formatZAR(Number(q.order.amountPaid))} paid so far`}). Take it from there
          on Admin → Orders, like any other order.
        </div>
      ) : q.status === "DECLINED" ? (
        <p className="rounded-sm border border-basalt/10 bg-white p-4 font-body text-sm text-slate">The client declined this quotation. Duplicate it to quote again.</p>
      ) : (
        <QuotationSendPanel id={q.id} status={q.status} email={q.client.email} phone={q.client.phone} linkActive={q.linkActive} />
      )}

      <QuotationEditor quote={q} readOnly={answered} vatRegistered={vatRegistered} />
    </div>
  );
}
