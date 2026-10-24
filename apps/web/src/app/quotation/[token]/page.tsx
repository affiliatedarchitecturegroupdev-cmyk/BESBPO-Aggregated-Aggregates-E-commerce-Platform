import type { Metadata } from "next";
import Link from "next/link";
import { QuotationAnswer } from "@/components/quotation/QuotationAnswer";
import { api } from "@/lib/api";
import { formatZAR } from "@/lib/pricing";

export const metadata: Metadata = { title: "Your quotation", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type QuotationView = {
  quoteNumber: string;
  status: "QUOTED" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "DRAFT";
  issuedAt: string | null;
  validUntil: string | null;
  preparedBy: string | null;
  client: { name: string | null; companyName: string | null };
  delivery: { address: string | null; province: string | null; distanceKm: number | null };
  lines: { name: string; sku: string; slug: string; quantity: number; unitLabel: string; unitPrice: number; lineTotal: number; note: string | null }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  vat: number;
  notes: string | null;
  order: { orderNumber: string; paid: boolean } | null;
};

const day = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Johannesburg" });

/**
 * A client's sales quotation (docs/sales-quotes.md), from the private link
 * our sales team sent: the lines and totals, the PDF, and accept-and-pay.
 * Shows no costs, and nothing to anyone without the link.
 */
export default async function QuotationPage({ params }: { params: { token: string } }) {
  const result = await api<QuotationView>(`/quotations/view/${encodeURIComponent(params.token)}`);
  if (!result.ok) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-basalt">This quotation link isn&apos;t valid</h1>
        <p className="mt-3 font-body text-sm text-slate">It may have been replaced by a newer quotation. Ask our sales team for the latest link, or browse the store.</p>
        <Link href="/" className="mt-6 inline-block rounded-sm bg-seam-blue px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-basalt">
          Visit the store
        </Link>
      </div>
    );
  }
  const q = result.data;
  const site = q.delivery.address ? `${q.delivery.address}${q.delivery.province ? `, ${q.delivery.province}` : ""}` : q.delivery.province;
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="font-mono text-xs uppercase tracking-widest text-seam-blue">Quotation {q.quoteNumber}</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-basalt">
        {q.client.companyName ?? q.client.name ? `For ${q.client.companyName ?? q.client.name}` : "Your quotation"}
      </h1>
      <p className="mt-2 font-body text-sm text-slate">
        {q.issuedAt ? `Issued ${day(q.issuedAt)}` : ""}
        {q.validUntil ? ` · valid until ${day(q.validUntil)}` : ""}
        {q.preparedBy ? ` · prepared by ${q.preparedBy}` : ""}
        {site ? ` · delivered to ${site}` : ""}
      </p>

      <div className="mt-6 overflow-x-auto rounded-sm border border-basalt/10 bg-white">
        <table className="w-full font-body text-sm">
          <thead className="bg-limestone text-left text-xs text-slate">
            <tr>
              <th className="p-3">Product</th>
              <th className="p-3">Quantity</th>
              <th className="hidden p-3 text-right sm:table-cell">Unit price</th>
              <th className="p-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-basalt/5">
            {q.lines.map((l) => (
              <tr key={`${l.sku}-${l.unitLabel}`}>
                <td className="p-3">
                  <Link href={`/products/${l.slug}`} className="font-semibold text-basalt hover:text-seam-blue">
                    {l.name}
                  </Link>
                  {l.note && <span className="block text-xs text-slate">{l.note}</span>}
                  <span className="block text-xs text-slate sm:hidden">{formatZAR(l.unitPrice)} each</span>
                </td>
                <td className="p-3">
                  {l.quantity} {l.unitLabel}
                </td>
                <td className="hidden p-3 text-right tabular-nums sm:table-cell">{formatZAR(l.unitPrice)}</td>
                <td className="p-3 text-right tabular-nums">{formatZAR(l.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="space-y-1 border-t border-basalt/10 p-4 font-body text-sm">
          <div className="flex justify-between">
            <dt className="text-slate">Materials</dt>
            <dd className="tabular-nums">{formatZAR(q.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate">Delivery{q.delivery.distanceKm !== null ? ` (${q.delivery.distanceKm} km)` : ""}</dt>
            <dd className="tabular-nums">{q.deliveryFee === 0 ? "Included" : formatZAR(q.deliveryFee)}</dd>
          </div>
          <div className="flex justify-between border-t border-basalt/10 pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatZAR(q.total)}</dd>
          </div>
          <p className="text-right text-xs text-slate">Includes VAT of {formatZAR(q.vat)}</p>
        </dl>
      </div>
      {q.notes && <p className="mt-4 rounded-sm bg-limestone/70 p-3 font-body text-sm text-basalt">{q.notes}</p>}

      <div className="mt-6 space-y-4">
        <a href={`/api/quotation/${params.token}/pdf`} className="inline-block rounded-sm border border-basalt/20 bg-white px-4 py-2 font-body text-sm font-semibold text-basalt hover:border-seam-blue">
          Download the PDF
        </a>
        {q.order ? (
          <p className="font-body text-sm text-basalt">
            {q.order.paid
              ? `Thank you — order ${q.order.orderNumber} is paid. We'll be in touch about delivery.`
              : `You accepted this quotation — order ${q.order.orderNumber}. You can pay it below.`}
          </p>
        ) : null}
        {q.status === "EXPIRED" && <p className="font-body text-sm text-red-800">This quotation has expired. Contact us and we&apos;ll send you an updated one.</p>}
        {q.status === "DECLINED" && <p className="font-body text-sm text-slate">You declined this quotation. Contact us any time for an updated one.</p>}
        {(q.status === "QUOTED" || (q.status === "ACCEPTED" && q.order && !q.order.paid)) && (
          <QuotationAnswer token={params.token} total={formatZAR(q.total)} canDecline={q.status === "QUOTED"} />
        )}
        <p className="font-body text-xs text-slate">
          Questions? <Link href="/contact" className="text-seam-blue hover:underline">Contact our team</Link>. Prices include VAT; stock is confirmed with our partner
          supplier when you accept. See our <Link href="/legal/shipping-delivery" className="text-seam-blue hover:underline">Shipping &amp; Delivery policy</Link>.
        </p>
      </div>
    </div>
  );
}
