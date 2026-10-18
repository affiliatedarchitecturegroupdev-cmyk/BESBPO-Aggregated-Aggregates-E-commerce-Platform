import type { Metadata } from "next";
import Link from "next/link";
import { applyForCredit } from "./actions";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/account-types";
import { CREDIT_STATUS_LABEL, CREDIT_TERMS_DAYS, type MyCredit } from "@/lib/phase4";
import { formatZAR } from "@/lib/pricing";
import { requireSession, sessionToken } from "@/lib/session";

export const metadata: Metadata = { title: "Trade credit", robots: { index: false } };

/** A trade company's credit account (docs/trade-credit.md): apply, see the limit, what's owed and when. */
export default async function TradeCreditPage() {
  const user = await requireSession("/account/credit");
  const result = await api<MyCredit | null>("/credit/me", { token: sessionToken() });
  const credit = result.ok ? result.data : null;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/account/dashboard" className="hover:text-seam-blue">My account</Link> / Trade credit
      </nav>
      <h1 className="mt-3 font-display text-2xl font-bold text-basalt">Trade credit</h1>
      <p className="mt-2 font-body text-sm text-slate">
        Approved trade companies can order on account: the order is confirmed and delivered now, and each order is paid within your terms (7, 14, 30 or 60
        days from confirmation). See <Link href="/legal/terms-and-conditions#4a-trade-credit" className="text-seam-blue hover:underline">the trade credit terms</Link>.
      </p>

      {!credit ? (
        <p className="mt-6 rounded-sm border border-basalt/10 bg-white p-4 font-body text-sm text-basalt">
          Trade credit is for registered trade companies. <Link href="/account/apply" className="text-seam-blue hover:underline">Apply for a trade account</Link> first.
        </p>
      ) : (
        <>
          <section className="mt-6 rounded-sm border border-basalt/10 bg-white p-5 font-body text-sm">
            <h2 className="font-semibold text-basalt">{credit.name} · {CREDIT_STATUS_LABEL[credit.creditStatus]}</h2>
            {credit.creditStatus === "APPROVED" || credit.creditStatus === "SUSPENDED" ? (
              <dl className="mt-3 grid gap-3 sm:grid-cols-4">
                <div><dt className="font-mono text-[10px] uppercase text-slate">Limit</dt><dd className="font-semibold">{formatZAR(credit.creditLimit ?? 0)}</dd></div>
                <div><dt className="font-mono text-[10px] uppercase text-slate">Owed on account</dt><dd className="font-semibold">{formatZAR(credit.position.used)}</dd></div>
                <div><dt className="font-mono text-[10px] uppercase text-slate">Available</dt><dd className="font-semibold text-emerald-700">{formatZAR(credit.position.available)}</dd></div>
                <div><dt className="font-mono text-[10px] uppercase text-slate">Terms</dt><dd>{credit.paymentTermsDays} days</dd></div>
              </dl>
            ) : null}
            {credit.position.overdue > 0 && (
              <p className="mt-3 rounded-sm bg-red-50 p-2 text-red-800">
                {formatZAR(credit.position.overdue)} is overdue — new orders can&apos;t go on account until it&apos;s paid.
              </p>
            )}
            {credit.creditStatus === "APPLIED" && <p className="mt-2 text-slate">Applied {credit.creditAppliedAt ? formatDate(credit.creditAppliedAt) : ""}. We&apos;ll email you once it&apos;s reviewed.</p>}
            {credit.creditNotes && <p className="mt-2 text-slate">Note from our team: {credit.creditNotes}</p>}
            {credit.status !== "APPROVED" && <p className="mt-2 text-slate">Your trade account is still being reviewed — you can apply for credit once it&apos;s approved.</p>}
          </section>

          {credit.orders.length > 0 && (
            <section className="mt-6 rounded-sm border border-basalt/10 bg-white p-5">
              <h2 className="font-body text-sm font-semibold text-basalt">Orders on account</h2>
              <table className="mt-2 w-full text-left font-body text-xs">
                <thead className="text-slate">
                  <tr><th className="py-1 font-normal">Order</th><th className="py-1 font-normal">Total</th><th className="py-1 font-normal">Still owed</th><th className="py-1 font-normal">Due</th></tr>
                </thead>
                <tbody className="divide-y divide-basalt/5">
                  {credit.orders.map((o) => (
                    <tr key={o.id}>
                      <td className="py-1.5"><Link href={`/orders/${o.id}/confirmation`} className="font-mono text-seam-blue hover:underline">{o.orderNumber}</Link></td>
                      <td className="py-1.5">{formatZAR(o.total)}</td>
                      <td className="py-1.5">{o.balance > 0 ? formatZAR(o.balance) : "Paid"}</td>
                      <td className={`py-1.5 ${o.overdue ? "font-semibold text-red-700" : ""}`}>{o.accountDueAt ? formatDate(o.accountDueAt) : "—"}{o.overdue ? " · overdue" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 font-body text-[11px] text-slate">Pay by EFT with the order number as the reference, or from the order page.</p>
            </section>
          )}

          {credit.canApply ? (
            <section className="mt-6 rounded-sm border border-basalt/10 bg-white p-5">
              <h2 className="font-body text-sm font-semibold text-basalt">Apply for trade credit</h2>
              <ActionForm action={applyForCredit} className="mt-3 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block"><span className="font-mono text-[10px] uppercase text-slate">Credit limit you need (R) *</span><input name="requestedLimit" type="number" min={1000} max={5000000} step={1000} required className={inputClass} /></label>
                  <label className="block">
                    <span className="font-mono text-[10px] uppercase text-slate">Payment terms *</span>
                    <select name="requestedTermsDays" defaultValue="30" className={inputClass}>
                      {CREDIT_TERMS_DAYS.map((d) => <option key={d} value={d}>{d} days</option>)}
                    </select>
                  </label>
                  <label className="block"><span className="font-mono text-[10px] uppercase text-slate">Years trading *</span><input name="yearsTrading" type="number" min={0} max={200} required className={inputClass} /></label>
                  <label className="block"><span className="font-mono text-[10px] uppercase text-slate">Typical monthly spend (R)</span><input name="estimatedMonthlySpend" type="number" min={0} step={1000} className={inputClass} /></label>
                </div>
                <label className="block">
                  <span className="font-mono text-[10px] uppercase text-slate">Two trade references — business name and a contact for each *</span>
                  <textarea name="tradeReferences" required minLength={10} maxLength={2000} rows={3} className={inputClass} />
                </label>
                <label className="block"><span className="font-mono text-[10px] uppercase text-slate">Accounts contact (name and email)</span><input name="accountsContact" maxLength={120} className={inputClass} /></label>
                <label className="block"><span className="font-mono text-[10px] uppercase text-slate">Anything else we should know</span><textarea name="notes" maxLength={2000} rows={2} className={inputClass} /></label>
                <label className="flex items-start gap-2 font-body text-xs text-basalt">
                  <input type="checkbox" name="acceptTerms" className="mt-0.5" />
                  <span>
                    I&apos;m authorised to apply for {credit.name}, and I accept the <Link href="/legal/terms-and-conditions#4a-trade-credit" className="text-seam-blue hover:underline">trade credit terms</Link>: each order on account is paid within the terms, and an overdue order stops new orders on account.
                  </span>
                </label>
                <SubmitButton>Apply for trade credit</SubmitButton>
              </ActionForm>
            </section>
          ) : (
            credit.creditStatus === "NONE" && credit.status === "APPROVED" && user.role !== "COMPANY_ADMIN" && (
              <p className="mt-6 font-body text-sm text-slate">Your company&apos;s account administrator applies for trade credit.</p>
            )
          )}
        </>
      )}
    </div>
  );
}
