import type { Metadata } from "next";
import Link from "next/link";
import { removeMember, revokeInvite, updateMember, decideOrder } from "@/app/account/team/actions";
import { CompanySettingsForm, InviteForm } from "@/components/account/TeamForms";
import { api } from "@/lib/api";
import { COMPANY_ROLE_LABEL, type CompanyRole, type Team } from "@/lib/company-accounts";
import { formatZAR } from "@/lib/pricing";
import { requireSession, sessionToken } from "@/lib/session";

export const metadata: Metadata = { title: "Team", robots: { index: false } };

const ROLES: CompanyRole[] = ["ADMIN", "BUYER", "APPROVER", "ACCOUNTS"];
const small = "rounded-sm border border-basalt/20 px-2 py-1 font-body text-xs";
const date = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Johannesburg" });

/**
 * My account → Team (ROADMAP 6.1, docs/company-accounts.md): the people on the company's account and what each can
 * do, invitations, the ordering rules, and buyers' orders waiting for approval.
 */
export default async function TeamPage({ searchParams }: { searchParams: { error?: string; done?: string; joined?: string } }) {
  const user = await requireSession("/account/team");
  if (!user.company) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 font-body text-sm text-slate">
        Team accounts are part of a trade account.{" "}
        <Link href="/account/apply" className="text-seam-blue hover:underline">
          Apply for a trade account
        </Link>
        , or ask your company&apos;s account admin to invite you.
      </div>
    );
  }
  const result = await api<Team>("/company/team", { token: sessionToken() });
  if (!result.ok) return <p className="mx-auto max-w-3xl px-4 py-12 font-body text-sm text-slate">{result.message}</p>;
  const team = result.data;
  const admin = team.me.companyRole === "ADMIN";
  const approver = admin || team.me.companyRole === "APPROVER";

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <div>
        <Link href="/account/dashboard" className="font-body text-sm text-seam-blue hover:underline">
          ← My account
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-basalt">{team.company.name} — team</h1>
        <p className="mt-1 max-w-3xl font-body text-sm text-slate">
          Everyone here orders at {team.company.name}&apos;s trade prices and sees its orders, quotes and invoices. You&apos;re {COMPANY_ROLE_LABEL[team.me.companyRole].toLowerCase()}
          {team.me.companyRole === "BUYER" && team.me.spendLimit ? `, with a limit of ${formatZAR(Number(team.me.spendLimit))} per order` : ""}.
        </p>
      </div>
      {searchParams.joined && <p className="rounded-sm border border-seam-blue/30 bg-white p-3 font-body text-sm text-basalt">Welcome — you&apos;ve joined {searchParams.joined}.</p>}
      {searchParams.error && (
        <p role="alert" className="rounded-sm border border-red-700/30 bg-red-50 p-3 font-body text-sm text-red-800">
          {searchParams.error}
        </p>
      )}
      {searchParams.done && <p className="rounded-sm border border-seam-blue/30 bg-white p-3 font-body text-sm text-basalt">{searchParams.done}</p>}

      <section id="approvals">
        <h2 className="font-display text-lg font-bold text-basalt">Waiting for approval</h2>
        {team.awaiting.length === 0 ? (
          <p className="mt-2 font-body text-sm text-slate">No orders are waiting for approval.</p>
        ) : (
          <ul className="mt-2 divide-y divide-basalt/5 rounded-sm border border-basalt/10 bg-white">
            {team.awaiting.map((o) => (
              <li key={o.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div className="font-body text-sm">
                  <Link href={`/orders/${o.id}/confirmation`} className="font-semibold text-seam-blue hover:underline">
                    {o.orderNumber}
                  </Link>{" "}
                  · <strong>{formatZAR(Number(o.total))}</strong> · by {o.user?.name ?? o.user?.email ?? "a buyer"} on {date(o.createdAt)}
                  {o.purchaseOrderNumber ? ` · PO ${o.purchaseOrderNumber}` : ""}
                  <p className="text-xs text-slate">{o.approvalReason}</p>
                </div>
                {o.canDecide ? (
                  <form action={decideOrder} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="orderId" value={o.id} />
                    <input name="note" maxLength={500} placeholder="Note to the buyer (optional)" aria-label="Note to the buyer" className={`${small} w-48`} />
                    <button name="decision" value="APPROVE" className="rounded-sm bg-seam-blue px-3 py-1.5 font-body text-xs font-semibold text-limestone hover:bg-basalt">
                      Approve
                    </button>
                    <button name="decision" value="DECLINE" className="rounded-sm border border-red-700/40 px-3 py-1.5 font-body text-xs text-red-800 hover:bg-red-50">
                      Decline
                    </button>
                  </form>
                ) : (
                  <p className="font-body text-xs text-slate">{approver ? "Someone else approves your own order." : "Waiting for an approver."}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-lg font-bold text-basalt">People</h2>
        <ul className="mt-2 divide-y divide-basalt/5 rounded-sm border border-basalt/10 bg-white">
          {team.members.map((m) => (
            <li key={m.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
              <div className="font-body text-sm">
                <span className="font-semibold text-basalt">{m.name ?? m.email}</span>
                {m.isYou && <span className="text-slate"> (you)</span>}
                <span className="block text-xs text-slate">
                  {m.email} · {COMPANY_ROLE_LABEL[m.companyRole]}
                  {m.companyRole === "BUYER" ? (m.spendLimit ? ` · limit ${formatZAR(Number(m.spendLimit))} per order` : " · no limit of their own") : ""}
                </span>
              </div>
              {admin && (
                <div className="flex flex-wrap items-center gap-2">
                  <form action={updateMember} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={m.id} />
                    <select name="companyRole" defaultValue={m.companyRole} aria-label={`Role for ${m.email}`} className={small}>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {COMPANY_ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                    <input name="spendLimit" type="number" min={1} step="0.01" defaultValue={m.spendLimit ?? ""} placeholder="Buyer limit (R)" aria-label={`Limit per order for ${m.email}`} className={`${small} w-32`} />
                    <button className={`${small} text-seam-blue hover:border-seam-blue`}>Save</button>
                  </form>
                  {!m.isYou && (
                    <form action={removeMember}>
                      <input type="hidden" name="id" value={m.id} />
                      <button className={`${small} text-red-800 hover:border-red-700`}>Remove</button>
                    </form>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {admin && (
        <>
          <InviteForm />
          {team.invites.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-bold text-basalt">Invitations not yet accepted</h2>
              <ul className="mt-2 divide-y divide-basalt/5 rounded-sm border border-basalt/10 bg-white">
                {team.invites.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 p-3 font-body text-sm">
                    <span>
                      {i.email} · {COMPANY_ROLE_LABEL[i.role]}
                      {i.spendLimit ? ` · limit ${formatZAR(Number(i.spendLimit))}` : ""}
                      <span className="text-xs text-slate"> · expires {date(i.expiresAt)}</span>
                    </span>
                    <form action={revokeInvite}>
                      <input type="hidden" name="id" value={i.id} />
                      <button className={`${small} hover:border-red-700`}>Withdraw</button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <CompanySettingsForm approvalThreshold={team.company.approvalThreshold} requirePurchaseOrder={team.company.requirePurchaseOrder} />
        </>
      )}
    </div>
  );
}
