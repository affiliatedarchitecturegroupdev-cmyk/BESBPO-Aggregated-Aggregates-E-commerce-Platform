import Link from "next/link";
import { createPaymentLink, recordPayment, revokePaymentLink } from "@/app/admin/payments/actions";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { api } from "@/lib/api";
import { formatDate, PAYMENT_KIND_LABEL, type LedgerPayment, type OrderPayments } from "@/lib/account-types";
import { formatZAR } from "@/lib/pricing";
import { sessionToken } from "@/lib/session";

export const metadata = { title: "Order payments" };

type Ledger = Omit<OrderPayments, "choices" | "payments"> & {
  payments: (LedgerPayment & { gatewayLabel: string; providerCheckoutId: string | null; failureReason: string | null; recordedById: string | null })[];
  links: { id: string; kind: LedgerPayment["kind"]; amount: number; note: string | null; createdAt: string; expiresAt: string; paidAt: string | null; revokedAt: string | null; state: "OPEN" | "PAID" | "REVOKED" | "EXPIRED" }[];
};

const STATUS_TONE: Record<LedgerPayment["status"], string> = {
  PAID: "text-emerald-700",
  INITIATED: "text-seam-blue",
  FAILED: "text-red-700",
  CANCELLED: "text-slate",
  EXPIRED: "text-slate",
};
const PLAN_LABEL = { FULL: "Paying in full", DEPOSIT: "Deposit, balance before delivery", LAYBY: "Lay-by (LayUp)" };

/** Staff: an order's payments ledger — record an EFT, send a payment link, see every attempt. */
export default async function OrderPaymentsPage({ params }: { params: { id: string } }) {
  const result = await api<Ledger>(`/payments/orders/${encodeURIComponent(params.id)}/ledger`, { token: sessionToken() });
  if (!result.ok) return <p className="font-body text-sm text-slate">{result.message}</p>;
  const l = result.data;
  const open = l.balance > 0.01 && l.status !== "CANCELLED" && l.status !== "DELIVERED";
  return (
    <div className="space-y-6">
      <p className="font-body text-sm">
        <Link href="/admin/orders" className="text-seam-blue hover:underline">← Orders</Link>
      </p>
      <section className="rounded-sm border border-basalt/10 bg-white p-5 font-body text-sm">
        <h2 className="font-semibold text-basalt">
          {l.orderNumber} · {PLAN_LABEL[l.paymentPlan]}
          {l.depositPercent ? ` (${l.depositPercent}%)` : ""}
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-4">
          <div><dt className="font-mono text-[10px] uppercase text-slate">Total</dt><dd className="font-semibold">{formatZAR(l.total)}</dd></div>
          <div><dt className="font-mono text-[10px] uppercase text-slate">Paid</dt><dd className="font-semibold">{formatZAR(l.amountPaid)}</dd></div>
          <div><dt className="font-mono text-[10px] uppercase text-slate">Balance</dt><dd className={`font-semibold ${l.balance > 0 ? "text-ochre-gold" : "text-emerald-700"}`}>{l.balance > 0 ? formatZAR(l.balance) : "Paid in full"}</dd></div>
          <div><dt className="font-mono text-[10px] uppercase text-slate">Deposit on offer</dt><dd>{l.deposit.available ? `${l.deposit.percent}% · ${formatZAR(l.deposit.amount)}` : l.deposit.reason}</dd></div>
        </dl>
        {l.overpaid > 0 && <p className="mt-3 rounded-sm bg-red-50 p-2 text-red-800">Overpaid by {formatZAR(l.overpaid)} — refund the difference from the gateway (or by EFT) and record it under Finance → Refunds.</p>}
        {l.layby.active && <p className="mt-3 text-slate">Lay-by: {formatZAR(l.layby.active.paidSoFar)} paid to LayUp so far (checked hourly). The order is confirmed once the plan is paid off.</p>}
      </section>

      <section className="rounded-sm border border-basalt/10 bg-white p-5">
        <h2 className="font-body text-sm font-semibold text-basalt">Payments</h2>
        {l.payments.length === 0 ? (
          <p className="mt-2 font-body text-xs text-slate">No payments started yet.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left font-body text-xs">
              <thead className="text-slate">
                <tr>
                  <th className="py-1.5 pr-3 font-normal">Started</th>
                  <th className="py-1.5 pr-3 font-normal">Kind</th>
                  <th className="py-1.5 pr-3 font-normal">Amount</th>
                  <th className="py-1.5 pr-3 font-normal">Method · gateway</th>
                  <th className="py-1.5 pr-3 font-normal">Status</th>
                  <th className="py-1.5 pr-3 font-normal">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-basalt/5">
                {l.payments.map((p) => (
                  <tr key={p.id} className="align-top">
                    <td className="py-1.5 pr-3 font-mono">{formatDate(p.createdAt)}</td>
                    <td className="py-1.5 pr-3">{PAYMENT_KIND_LABEL[p.kind]}</td>
                    <td className="py-1.5 pr-3">{formatZAR(p.amount)}{p.paidSoFar !== null && p.status !== "PAID" && <span className="block text-slate">{formatZAR(p.paidSoFar)} paid so far</span>}</td>
                    <td className="py-1.5 pr-3">{p.methodKey} · {p.gatewayLabel}{p.recordedById && " (recorded by staff)"}</td>
                    <td className={`py-1.5 pr-3 font-semibold ${STATUS_TONE[p.status]}`}>
                      {p.status}
                      {p.paidAt && <span className="block font-normal text-slate">{formatDate(p.paidAt)}</span>}
                      {p.failureReason && <span className="block font-normal text-slate">{p.failureReason}</span>}
                    </td>
                    <td className="py-1.5 pr-3 font-mono">{p.providerReference ?? p.providerCheckoutId ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {open && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-sm border border-basalt/10 bg-white p-5">
            <h2 className="font-body text-sm font-semibold text-basalt">Send a payment link</h2>
            <p className="mt-1 font-body text-xs text-slate">The customer pays without signing in, by any method open to them for that amount. A proforma is on the page for their accounts team.</p>
            <ActionForm action={createPaymentLink} className="mt-3 space-y-3">
              <input type="hidden" name="orderId" value={l.orderId} />
              <label className="block">
                <span className="font-mono text-[10px] uppercase text-slate">For</span>
                <select name="kind" defaultValue={l.amountPaid > 0 ? "BALANCE" : "FULL"} className={inputClass}>
                  {l.amountPaid > 0 ? <option value="BALANCE">The balance ({formatZAR(l.balance)})</option> : <option value="FULL">The full amount ({formatZAR(l.total)})</option>}
                  {l.amountPaid === 0 && <option value="DEPOSIT">A deposit{l.deposit.available ? ` (${l.deposit.percent}% — ${formatZAR(l.deposit.amount)})` : " (enter the amount)"}</option>}
                  <option value="INSTALMENT">Part payment (enter the amount)</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="font-mono text-[10px] uppercase text-slate">Amount (R, optional)</span>
                  <input name="amount" type="number" step="0.01" min="0.01" max={l.balance} className={inputClass} />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] uppercase text-slate">Valid for (days)</span>
                  <input name="validDays" type="number" min={1} max={30} defaultValue={7} className={inputClass} />
                </label>
              </div>
              <label className="block">
                <span className="font-mono text-[10px] uppercase text-slate">Note to the customer</span>
                <input name="note" maxLength={500} className={inputClass} placeholder="e.g. Balance before your second load" />
              </label>
              <label className="flex items-center gap-2 font-body text-xs text-basalt">
                <input type="checkbox" name="send" defaultChecked className="h-4 w-4" /> Email it to the customer
              </label>
              <SubmitButton>Create link</SubmitButton>
            </ActionForm>
          </section>
          <section className="rounded-sm border border-basalt/10 bg-white p-5">
            <h2 className="font-body text-sm font-semibold text-basalt">Record an EFT received</h2>
            <p className="mt-1 font-body text-xs text-slate">Check the bank statement first. The first payment confirms the order; the customer is sent a receipt.</p>
            <ActionForm action={recordPayment} className="mt-3 space-y-3">
              <input type="hidden" name="orderId" value={l.orderId} />
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="font-mono text-[10px] uppercase text-slate">Amount (R)</span>
                  <input name="amount" type="number" step="0.01" min="0.01" max={l.balance} defaultValue={l.balance} required className={inputClass} />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] uppercase text-slate">Bank reference</span>
                  <input name="reference" maxLength={120} className={inputClass} />
                </label>
              </div>
              <SubmitButton>Record payment</SubmitButton>
            </ActionForm>
          </section>
        </div>
      )}

      {l.links.length > 0 && (
        <section className="rounded-sm border border-basalt/10 bg-white p-5">
          <h2 className="font-body text-sm font-semibold text-basalt">Payment links</h2>
          <ul className="mt-2 divide-y divide-basalt/5 font-body text-xs">
            {l.links.map((link) => (
              <li key={link.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  {PAYMENT_KIND_LABEL[link.kind]} · {formatZAR(link.amount)} · sent {formatDate(link.createdAt)} · {link.state === "OPEN" ? `valid until ${formatDate(link.expiresAt)}` : link.state.toLowerCase()}
                  {link.note && <span className="block text-slate">{link.note}</span>}
                </span>
                {link.state === "OPEN" && (
                  <form action={revokePaymentLink}>
                    <input type="hidden" name="linkId" value={link.id} />
                    <input type="hidden" name="orderId" value={l.orderId} />
                    <button className="text-red-700 hover:underline">Revoke</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
