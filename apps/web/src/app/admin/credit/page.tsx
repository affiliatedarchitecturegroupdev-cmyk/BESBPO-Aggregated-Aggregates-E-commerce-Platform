import Link from "next/link";
import { decideCredit } from "@/app/account/credit/actions";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/account-types";
import { CREDIT_STATUS_LABEL, CREDIT_TERMS_DAYS, type AccountOrder, type CreditAccount } from "@/lib/phase4";
import { formatZAR } from "@/lib/pricing";
import { sessionToken } from "@/lib/session";

export const metadata = { title: "Trade credit" };

/** Staff: trade credit applications and accounts (docs/trade-credit.md), and every unpaid order on account. */
export default async function AdminCreditPage() {
  const token = sessionToken();
  const [accounts, receivables] = await Promise.all([
    api<CreditAccount[]>("/credit/accounts", { token }),
    api<(AccountOrder & { company: { id: string; name: string } | null })[]>("/credit/receivables", { token }),
  ]);
  if (!accounts.ok) return <p className="font-body text-sm text-slate">{accounts.message}</p>;
  const owed = receivables.ok ? receivables.data : [];
  return (
    <div className="space-y-6">
      <section className="rounded-sm border border-basalt/10 bg-white p-5">
        <h2 className="font-body text-sm font-semibold text-basalt">Owed on account</h2>
        {owed.length === 0 ? (
          <p className="mt-2 font-body text-xs text-slate">Nothing owed on account.</p>
        ) : (
          <table className="mt-2 w-full text-left font-body text-xs">
            <thead className="text-slate"><tr><th className="py-1 font-normal">Order</th><th className="py-1 font-normal">Company</th><th className="py-1 font-normal">Owed</th><th className="py-1 font-normal">Due</th></tr></thead>
            <tbody className="divide-y divide-basalt/5">
              {owed.map((o) => (
                <tr key={o.id}>
                  <td className="py-1.5"><Link href={`/admin/orders/${o.id}/payments`} className="font-mono text-seam-blue hover:underline">{o.orderNumber}</Link></td>
                  <td className="py-1.5">{o.company?.name ?? "—"}</td>
                  <td className="py-1.5">{formatZAR(o.balance)}</td>
                  <td className={`py-1.5 ${o.overdue ? "font-semibold text-red-700" : ""}`}>{o.accountDueAt ? formatDate(o.accountDueAt) : "—"}{o.overdue ? " · overdue" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {accounts.data.length === 0 && <p className="font-body text-sm text-slate">No trade credit applications yet.</p>}
      {accounts.data.map((c) => {
        const app = c.creditApplication;
        return (
          <section key={c.id} className="rounded-sm border border-basalt/10 bg-white p-5 font-body text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold text-basalt">{c.name}</h2>
              <span className="font-mono text-[11px] uppercase text-slate">{CREDIT_STATUS_LABEL[c.creditStatus]}</span>
            </div>
            <p className="mt-1 text-xs text-slate">
              {c.tier} · Reg {c.registrationNumber ?? "—"} · VAT {c.vatNumber ?? "—"} · {c.users.map((u) => `${u.name ?? u.email} (${u.email})`).join(", ")}
            </p>
            {app && (
              <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                <div><dt className="text-slate">Asked for</dt><dd>{app.requestedLimit ? formatZAR(app.requestedLimit) : "—"} on {app.requestedTermsDays ?? "—"}-day terms</dd></div>
                <div><dt className="text-slate">Trading</dt><dd>{app.yearsTrading ?? "—"} years · spend {app.estimatedMonthlySpend ? `${formatZAR(app.estimatedMonthlySpend)}/month` : "not given"}</dd></div>
                <div className="sm:col-span-2"><dt className="text-slate">Trade references</dt><dd className="whitespace-pre-line">{app.tradeReferences}</dd></div>
                {app.accountsContact && <div><dt className="text-slate">Accounts contact</dt><dd>{app.accountsContact}</dd></div>}
                {app.notes && <div><dt className="text-slate">Notes</dt><dd>{app.notes}</dd></div>}
                <div><dt className="text-slate">Applied</dt><dd>{c.creditAppliedAt ? formatDate(c.creditAppliedAt) : "—"} · terms accepted {app.acceptedTermsAt ? formatDate(app.acceptedTermsAt) : "—"}</dd></div>
              </dl>
            )}
            {(c.creditStatus === "APPROVED" || c.creditStatus === "SUSPENDED") && (
              <p className="mt-3 text-xs">
                Limit {formatZAR(c.position.limit || (c.creditLimit ?? 0))} · owed {formatZAR(c.position.used)} · available {formatZAR(c.position.available)}
                {c.position.overdue > 0 && <span className="font-semibold text-red-700"> · {formatZAR(c.position.overdue)} overdue</span>}
              </p>
            )}
            {c.creditNotes && <p className="mt-1 text-xs text-slate">Note sent: {c.creditNotes}</p>}
            <ActionForm action={decideCredit} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
              <input type="hidden" name="companyId" value={c.id} />
              <label className="block"><span className="font-mono text-[10px] uppercase text-slate">Limit (R)</span><input name="limit" type="number" min={1000} max={5000000} step={1000} defaultValue={c.creditLimit ?? app?.requestedLimit ?? ""} className={inputClass} /></label>
              <label className="block">
                <span className="font-mono text-[10px] uppercase text-slate">Terms</span>
                <select name="termsDays" defaultValue={String(c.paymentTermsDays ?? app?.requestedTermsDays ?? 30)} className={inputClass}>
                  {CREDIT_TERMS_DAYS.map((d) => <option key={d} value={d}>{d} days</option>)}
                </select>
              </label>
              <label className="block"><span className="font-mono text-[10px] uppercase text-slate">Note to the company</span><input name="notes" maxLength={2000} className={inputClass} /></label>
              <div className="flex flex-wrap gap-2">
                <select name="decision" defaultValue="APPROVE" className={`${inputClass} mt-0 w-auto`}>
                  <option value="APPROVE">{c.creditStatus === "APPROVED" ? "Change limit/terms" : c.creditStatus === "SUSPENDED" ? "Reopen" : "Approve"}</option>
                  {c.creditStatus !== "APPROVED" && c.creditStatus !== "SUSPENDED" && <option value="DECLINE">Decline</option>}
                  {c.creditStatus === "APPROVED" && <option value="SUSPEND">Suspend</option>}
                </select>
                <SubmitButton variant="subtle">Save</SubmitButton>
              </div>
            </ActionForm>
          </section>
        );
      })}
    </div>
  );
}
