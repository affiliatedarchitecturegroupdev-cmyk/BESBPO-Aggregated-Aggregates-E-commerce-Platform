import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { api } from "@/lib/api";
import { formatDate, QUOTE_STATUS_LABEL, TIER_LABEL, UNIT_LABEL, type Application, type QuoteRecord } from "@/lib/account-types";
import { formatZAR } from "@/lib/pricing";
import { isStaff, requireSession, sessionToken } from "@/lib/session";
import { priceQuote, reviewApplication } from "../actions";

export const metadata: Metadata = { title: "Staff Console", robots: { index: false } };

const VIEWS = { applications: "Trade applications", quotes: "Quote requests" } as const;
type View = keyof typeof VIEWS;

/**
 * Minimal staff tools until the Phase 4 admin: approve trade tiers and price
 * quote requests. Roles are granted with `pnpm db:set-role`, never here.
 */
export default async function StaffPage({ searchParams }: { searchParams: { view?: string; status?: string } }) {
  const user = await requireSession("/account/staff");
  if (!isStaff(user)) notFound();
  const view: View = searchParams.view === "quotes" ? "quotes" : "applications";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="font-mono text-xs text-slate">Signed in as {user.email} · {user.role}</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-basalt">Staff console</h1>
      <nav className="mt-6 flex gap-2 font-body text-sm">
        {(Object.keys(VIEWS) as View[]).map((v) => (
          <Link
            key={v}
            href={`/account/staff?view=${v}`}
            className={`rounded-sm px-4 py-2 ${v === view ? "bg-seam-blue text-limestone" : "border border-basalt/20 text-basalt"}`}
          >
            {VIEWS[v]}
          </Link>
        ))}
      </nav>
      {view === "applications" ? <Applications status={searchParams.status} /> : <Quotes status={searchParams.status} />}
    </div>
  );
}

async function Applications({ status = "PENDING" }: { status?: string }) {
  const result = await api<Application[]>(`/trade-accounts/applications?status=${encodeURIComponent(status)}`, { token: sessionToken() });
  return (
    <section className="mt-6">
      <StatusFilter view="applications" current={status} options={["PENDING", "APPROVED", "DECLINED"]} />
      {!result.ok ? (
        <p className="mt-4 font-body text-sm text-slate">{result.message}</p>
      ) : result.data.length === 0 ? (
        <p className="mt-4 font-body text-sm text-slate">Nothing here.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {result.data.map((company) => (
            <li key={company.id} className="rounded-sm border border-basalt/10 bg-white p-5 font-body text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-semibold text-basalt">{company.name}</p>
                <p className="font-mono text-[11px] text-slate">Applied {formatDate(company.createdAt)} · {company.status}</p>
              </div>
              <p className="mt-1 text-slate">
                Requests <strong>{company.requestedTier ? TIER_LABEL[company.requestedTier.name] : "—"}</strong> · currently{" "}
                {TIER_LABEL[company.tier.name]}
                {company.registrationNumber && ` · Reg ${company.registrationNumber}`}
                {company.vatNumber && ` · VAT ${company.vatNumber}`}
                {company.contactPhone && ` · ${company.contactPhone}`}
              </p>
              <p className="text-slate">{company.users.map((u) => `${u.name ?? ""} <${u.email}>`).join(", ")}</p>
              {company.applicationNotes && <p className="mt-2 rounded-sm bg-limestone p-2 text-slate">{company.applicationNotes}</p>}
              <ActionForm action={reviewApplication} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
                <input type="hidden" name="companyId" value={company.id} />
                <label className="block">
                  <span className="font-mono text-[10px] uppercase text-slate">Decision</span>
                  <select name="decision" className={inputClass}>
                    <option value="APPROVE">Approve</option>
                    <option value="DECLINE">Decline</option>
                  </select>
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] uppercase text-slate">Tier (on approval)</span>
                  <select name="tier" defaultValue={company.requestedTier?.name ?? "CONTRACTOR_TRADE"} className={inputClass}>
                    <option value="CONTRACTOR_TRADE">{TIER_LABEL.CONTRACTOR_TRADE}</option>
                    <option value="VOLUME_CIVIL_BULK">{TIER_LABEL.VOLUME_CIVIL_BULK}</option>
                  </select>
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] uppercase text-slate">Note to customer</span>
                  <input name="notes" defaultValue={company.reviewNotes ?? ""} className={inputClass} />
                </label>
                <SubmitButton>Save</SubmitButton>
              </ActionForm>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

async function Quotes({ status = "SUBMITTED" }: { status?: string }) {
  const result = await api<QuoteRecord[]>(`/quotes?status=${encodeURIComponent(status)}`, { token: sessionToken() });
  return (
    <section className="mt-6">
      <StatusFilter view="quotes" current={status} options={["SUBMITTED", "QUOTED", "ACCEPTED", "DECLINED", "EXPIRED"]} />
      {!result.ok ? (
        <p className="mt-4 font-body text-sm text-slate">{result.message}</p>
      ) : result.data.length === 0 ? (
        <p className="mt-4 font-body text-sm text-slate">Nothing here.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {result.data.map((quote) => (
            <li key={quote.id} className="rounded-sm border border-basalt/10 bg-white p-5 font-body text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <p>
                  <span className="font-mono text-xs text-slate">{quote.reference}</span>{" "}
                  <span className="font-semibold text-basalt">{quote.projectName ?? quote.companyName ?? quote.contactName}</span>
                </p>
                <p className="font-mono text-[11px] text-slate">{formatDate(quote.createdAt)} · {QUOTE_STATUS_LABEL[quote.status]}</p>
              </div>
              <p className="mt-1 text-slate">
                {quote.contactName} · {quote.contactEmail}
                {quote.contactPhone && ` · ${quote.contactPhone}`}
                {quote.companyName && ` · ${quote.companyName}`}
              </p>
              <p className="text-slate">
                Deliver to {quote.deliveryAddress}
                {quote.deliveryProvince && `, ${quote.deliveryProvince}`}
                {quote.deliveryDistanceKm !== null && ` · ~${quote.deliveryDistanceKm}km from supplier`}
              </p>
              <table className="mt-3 w-full text-left">
                <tbody>
                  {quote.lineItems.map((line) => (
                    <tr key={line.id} className="border-b border-basalt/5">
                      <td className="py-1.5">{line.product.name} <span className="font-mono text-[10px] text-slate">{line.product.sku}</span></td>
                      <td>{line.quantity} {UNIT_LABEL[line.unitOfSale]}</td>
                      <td className="text-right">{line.estimatedUnitPrice ? `${formatZAR(Number(line.estimatedUnitPrice))} each` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-slate">
                Materials at requester&apos;s tier: <strong className="text-basalt">{quote.estimatedSubtotal ? formatZAR(Number(quote.estimatedSubtotal)) : "—"}</strong>
                {" · "}
                {quote.reasons.length > 0 ? quote.reasons.join(" ") : "Customer asked for a quote (priceable at checkout)."}
              </p>
              {quote.notes && <p className="mt-2 rounded-sm bg-limestone p-2 text-slate">{quote.notes}</p>}
              <ActionForm action={priceQuote} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
                <input type="hidden" name="id" value={quote.id} />
                <label className="block">
                  <span className="font-mono text-[10px] uppercase text-slate">Delivered total (R)</span>
                  <input name="quotedTotal" type="number" step="0.01" min="0" defaultValue={quote.quotedTotal ?? ""} className={inputClass} />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] uppercase text-slate">Or set status</span>
                  <select name="status" defaultValue="" className={inputClass}>
                    <option value="">—</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="DECLINED">Declined</option>
                  </select>
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] uppercase text-slate">Note to customer</span>
                  <input name="staffNotes" defaultValue={quote.staffNotes ?? ""} className={inputClass} />
                </label>
                <SubmitButton>Save</SubmitButton>
              </ActionForm>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StatusFilter({ view, current, options }: { view: View; current: string; options: string[] }) {
  return (
    <div className="flex flex-wrap gap-2 font-mono text-[11px]">
      {options.map((status) => (
        <Link
          key={status}
          href={`/account/staff?view=${view}&status=${status}`}
          className={`rounded-sm px-2.5 py-1 ${status === current ? "bg-basalt text-limestone" : "bg-white text-slate"}`}
        >
          {status}
        </Link>
      ))}
    </div>
  );
}
