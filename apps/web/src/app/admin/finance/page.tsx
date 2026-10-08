import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteOperatingCost, saveDeliveryRates, saveOperatingCost } from "@/app/admin/finance/actions";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { api } from "@/lib/api";
import { formatZAR } from "@/lib/pricing";
import { getSession, sessionToken } from "@/lib/session";

export const metadata = { title: "Finance" };

type Quality = {
  paidOrders: number;
  linesMissingCost: number;
  linesEstimated: number;
  ordersEstimatedTimes: number;
  paidOrdersWithoutPaymentMethod: number;
  dispatchedWithoutDeliveryCost: number;
  testOrders: number;
  testBookings: number;
  deliveryRatesSet: number;
  monthsWithOperatingCosts: number;
};
type Rates = { rates: { carrier: string; bandLabel: string; load: string; costExVat: string }[]; distanceBands: { label: string; minKm: number; maxKm: number | null }[] };
type OperatingCost = { id: string; month: string; category: string; description: string; amountExVat: string };
type Refund = { id: string; amount: string; reason: string; reference: string | null; refundedAt: string; order: { orderNumber: string } | null; booking: { reference: string } | null; orderId: string | null; bookingId: string | null };

const CARRIERS = [
  { value: "BESFLEET", label: "Besfleet" },
  { value: "EXTERNAL_PARTNER", label: "External partners" },
];
const LOADS = [
  { value: "M3_6", label: "6m³ load" },
  { value: "M3_10", label: "10m³ load" },
  { value: "M3_14_PLUS", label: "14m³+ load" },
  { value: "BAGGED", label: "Bagged / small" },
];
const BAND_LABEL = (b: Rates["distanceBands"][number]) => (b.maxKm === null ? `${b.minKm}km+` : `${b.minKm}–${b.maxKm}km`);
const CATEGORIES: Record<string, string> = {
  SALARIES: "Salaries & wages",
  RENT: "Rent & premises",
  MARKETING: "Marketing & advertising",
  SOFTWARE: "Software & hosting",
  VEHICLES: "Vehicles & fuel (not deliveries)",
  PROFESSIONAL_FEES: "Professional fees",
  BANK_CHARGES: "Bank & card charges",
  INSURANCE: "Insurance",
  OTHER: "Other",
};
const month = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", { month: "long", year: "numeric", timeZone: "UTC" });
const day = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Johannesburg" });
const thisMonth = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" }).slice(0, 7);

/**
 * Admin-only finance set-up for the sales dashboard (ANALYTICS.md, Phase 1):
 * what's still missing before profit figures can be trusted, the standard
 * delivery costs applied at dispatch, monthly operating costs for the
 * management P&L, and every refund recorded.
 */
export default async function FinancePage() {
  const user = await getSession();
  if (user?.role !== "ADMIN") notFound();
  const token = sessionToken();
  const [quality, rates, costs, refunds] = await Promise.all([
    api<Quality>("/finance/data-quality", { token }),
    api<Rates>("/finance/delivery-rates", { token }),
    api<OperatingCost[]>("/finance/operating-costs", { token }),
    api<Refund[]>("/finance/refunds", { token }),
  ]);
  const rateOf = (carrier: string, band: string, load: string) => (rates.ok ? rates.data.rates.find((r) => r.carrier === carrier && r.bandLabel === band && r.load === load)?.costExVat : undefined);
  const byMonth = new Map<string, OperatingCost[]>();
  for (const c of costs.ok ? costs.data : []) byMonth.set(c.month.slice(0, 7), [...(byMonth.get(c.month.slice(0, 7)) ?? []), c]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-xl font-bold text-basalt">Finance set-up</h2>
        <p className="mt-1 max-w-3xl font-body text-xs text-slate">
          Admins only. These feed the sales dashboard&apos;s profit and P&amp;L figures. All amounts here are excluding VAT, except refunds, which record what was
          actually paid back. This is a management view, not statutory accounts.
        </p>
      </div>

      {quality.ok && (
        <section>
          <h3 className="font-display text-base font-semibold text-basalt">Data quality</h3>
          <ul className="mt-3 grid gap-3 font-body text-sm sm:grid-cols-2 lg:grid-cols-3">
            {[
              { ok: quality.data.linesMissingCost === 0, text: `${quality.data.linesMissingCost} paid order line(s) without a cost`, hint: "Usually products priced before costs were captured." },
              { ok: quality.data.dispatchedWithoutDeliveryCost === 0, text: `${quality.data.dispatchedWithoutDeliveryCost} dispatched deliveries without a cost`, hint: "Set standard rates below, or enter the actual cost on dispatch." },
              { ok: quality.data.deliveryRatesSet > 0, text: `${quality.data.deliveryRatesSet} standard delivery rate(s) set`, hint: "Applied automatically when staff don't enter an actual cost." },
              { ok: quality.data.monthsWithOperatingCosts > 0, text: `${quality.data.monthsWithOperatingCosts} month(s) with operating costs`, hint: "Needed for the net P&L." },
              { ok: quality.data.paidOrdersWithoutPaymentMethod === 0, text: `${quality.data.paidOrdersWithoutPaymentMethod} paid order(s) without a payment method`, hint: "Pick the method when confirming payment." },
              { ok: true, text: `${quality.data.linesEstimated} line(s) and ${quality.data.ordersEstimatedTimes} order date(s) estimated`, hint: "Backfilled for orders placed before reporting started — shown as estimates." },
              { ok: true, text: `${quality.data.testOrders} test order(s), ${quality.data.testBookings} test booking(s) excluded`, hint: "Staff/admin orders are tests by default; toggle on the order or booking." },
            ].map((item) => (
              <li key={item.text} className={`rounded-sm border p-3 ${item.ok ? "border-basalt/10 bg-white" : "border-ochre-gold/50 bg-ochre-gold/10"}`}>
                <p className="font-semibold text-basalt">{item.ok ? "✓ " : "! "}{item.text}</p>
                <p className="mt-1 text-xs text-slate">{item.hint}</p>
              </li>
            ))}
          </ul>
          <p className="mt-2 font-body text-xs text-slate">{quality.data.paidOrders} paid order(s) count towards reporting so far.</p>
        </section>
      )}

      <section>
        <h3 className="font-display text-base font-semibold text-basalt">Standard delivery costs (R, ex VAT)</h3>
        <p className="mt-1 max-w-3xl font-body text-xs text-slate">
          What a delivery costs us, by carrier, distance band and load. Applied at dispatch unless staff enter the actual amount. Leave a cell blank for no rate —
          the delivery&apos;s cost then stays unrecorded rather than guessed. Ready-mix travels in the plant&apos;s mixer and isn&apos;t costed here.
        </p>
        {rates.ok && (
          <ActionForm action={saveDeliveryRates} className="mt-3 space-y-3">
            <div className="overflow-x-auto rounded-sm border border-basalt/10 bg-white">
              <table className="w-full min-w-[40rem] font-body text-sm">
                <thead>
                  <tr className="text-left font-mono text-[10px] uppercase text-slate">
                    <th className="px-3 py-2">Carrier · band</th>
                    {LOADS.map((l) => <th key={l.value} className="px-3 py-2">{l.label}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-basalt/10">
                  {CARRIERS.flatMap((c) =>
                    rates.data.distanceBands.map((b) => (
                      <tr key={`${c.value}-${b.label}`}>
                        <td className="px-3 py-2 text-basalt">{c.label} · {BAND_LABEL(b)}</td>
                        {LOADS.map((l) => (
                          <td key={l.value} className="px-3 py-1.5">
                            <input
                              name={`rate:${c.value}:${b.label}:${l.value}`}
                              type="number"
                              step="0.01"
                              min="0"
                              defaultValue={rateOf(c.value, b.label, l.value) ?? ""}
                              aria-label={`${c.label} ${BAND_LABEL(b)} ${l.label}`}
                              className={`${inputClass} mt-0 w-28`}
                            />
                          </td>
                        ))}
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
            <SubmitButton>Save delivery costs</SubmitButton>
          </ActionForm>
        )}
      </section>

      <section>
        <h3 className="font-display text-base font-semibold text-basalt">Monthly operating costs (R, ex VAT)</h3>
        <p className="mt-1 max-w-3xl font-body text-xs text-slate">Costs of running the business that aren&apos;t tied to a sale — for the net P&amp;L. Delivery costs and product costs are captured per order, so don&apos;t add them here.</p>
        <ActionForm action={saveOperatingCost} className="mt-3 grid gap-2 rounded-sm border border-basalt/10 bg-white p-3 sm:grid-cols-[9rem_14rem_1fr_9rem_auto] sm:items-end">
          <label className="block"><span className="font-mono text-[10px] uppercase text-slate">Month</span><input name="month" type="month" required defaultValue={thisMonth()} className={inputClass} /></label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase text-slate">Category</span>
            <select name="category" required className={inputClass}>{Object.entries(CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </label>
          <label className="block"><span className="font-mono text-[10px] uppercase text-slate">Description</span><input name="description" required minLength={2} maxLength={200} className={inputClass} /></label>
          <label className="block"><span className="font-mono text-[10px] uppercase text-slate">Amount</span><input name="amountExVat" type="number" step="0.01" min="0" required className={inputClass} /></label>
          <SubmitButton>Add</SubmitButton>
        </ActionForm>
        {byMonth.size === 0 ? (
          <p className="mt-3 font-body text-sm text-slate">No operating costs yet.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {[...byMonth].map(([ym, rows]) => (
              <div key={ym} className="rounded-sm border border-basalt/10 bg-white p-3 font-body text-sm">
                <p className="flex justify-between font-semibold text-basalt">
                  <span>{month(rows[0].month)}</span>
                  <span>{formatZAR(rows.reduce((n, r) => n + Number(r.amountExVat), 0))}</span>
                </p>
                <ul className="mt-2 divide-y divide-basalt/10">
                  {rows.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                      <span className="text-basalt">{CATEGORIES[r.category] ?? r.category} — {r.description}</span>
                      <span className="flex items-center gap-3">
                        <span>{formatZAR(Number(r.amountExVat))}</span>
                        <form action={deleteOperatingCost}>
                          <input type="hidden" name="id" value={r.id} />
                          <button className="text-xs text-slate hover:text-red-700">Remove</button>
                        </form>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="font-display text-base font-semibold text-basalt">Refunds</h3>
        <p className="mt-1 font-body text-xs text-slate">Recorded by staff on each order or booking once paid back. Revenue is reported net of these.</p>
        {!refunds.ok || refunds.data.length === 0 ? (
          <p className="mt-3 font-body text-sm text-slate">No refunds recorded.</p>
        ) : (
          <ul className="mt-3 divide-y divide-basalt/10 rounded-sm border border-basalt/10 bg-white font-body text-sm">
            {refunds.data.map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2 px-3 py-2">
                <span className="text-basalt">
                  {r.order ? `Order ${r.order.orderNumber}` : r.booking ? (
                    <Link href={`/admin/bookings/${r.bookingId}`} className="text-seam-blue hover:underline">Booking {r.booking.reference}</Link>
                  ) : "—"}{" "}
                  · {r.reason}{r.reference ? ` · ref ${r.reference}` : ""}
                </span>
                <span className="text-slate">{formatZAR(Number(r.amount))} · {day(r.refundedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
