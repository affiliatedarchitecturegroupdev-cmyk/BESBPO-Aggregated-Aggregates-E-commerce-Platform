import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, Field, SubmitButton } from "@/components/account/Forms";
import { api } from "@/lib/api";
import {
  formatDate,
  QUOTE_STATUS_LABEL,
  TIER_LABEL,
  UNIT_LABEL,
  type CompanyDashboard,
  type QuoteRecord,
} from "@/lib/account-types";
import { formatZAR } from "@/lib/pricing";
import { isStaff, requireSession, sessionToken, type SessionUser } from "@/lib/session";
import { addDeliveryAddress, logout, removeDeliveryAddress, respondToQuote } from "../actions";

export const metadata: Metadata = { title: "Trade Account Dashboard", robots: { index: false } };

const card = "rounded-sm border border-basalt/10 bg-white";

/**
 * Module 4 dashboard (wireframe 05): tier status, quotes, orders, standing
 * addresses and invoices for the signed-in user's company.
 */
export default async function DashboardPage({ searchParams }: { searchParams: { applied?: string } }) {
  const user = await requireSession("/account/dashboard");
  const token = sessionToken();
  const [company, quotes] = await Promise.all([
    api<CompanyDashboard | null>("/trade-accounts/me", { token }),
    api<QuoteRecord[]>("/quotes/mine", { token }),
  ]);
  const dashboard = company.ok ? company.data : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-slate">{user.email}</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-basalt">
            Welcome back{dashboard ? ` — ${dashboard.name}` : user.name ? `, ${user.name}` : ""}
          </h1>
        </div>
        <div className="flex gap-3">
          {isStaff(user) && (
            <Link href="/account/staff" className="rounded-sm bg-basalt px-4 py-2 font-body text-sm text-limestone hover:bg-seam-blue">
              Staff console
            </Link>
          )}
          <form action={logout}>
            <button className="rounded-sm border border-basalt/20 px-4 py-2 font-body text-sm text-basalt hover:bg-white">Sign out</button>
          </form>
        </div>
      </div>

      {searchParams.applied && (
        <p className="mt-6 rounded-sm border border-seam-blue/30 bg-seam-blue/5 p-3 font-body text-sm text-seam-blue">
          Application received — we&apos;ll review it within one business day. You can request quotes at list price in the meantime.
        </p>
      )}

      <StatusCards user={user} dashboard={dashboard} quotes={quotes.ok ? quotes.data : []} />

      <section id="quotes" className={`mt-8 ${card}`}>
        <div className="flex items-center justify-between border-b border-basalt/10 px-4 py-3">
          <h2 className="font-body text-sm font-semibold text-basalt">Quotes / RFQs</h2>
          <Link href="/quote" className="font-body text-xs font-semibold text-seam-blue hover:underline">New quote request →</Link>
        </div>
        {!quotes.ok ? (
          <p className="p-4 font-body text-sm text-slate">{quotes.message}</p>
        ) : quotes.data.length === 0 ? (
          <p className="p-4 font-body text-sm text-slate">No quote requests yet.</p>
        ) : (
          <ul className="divide-y divide-basalt/5">
            {quotes.data.map((quote) => (
              <li key={quote.id} className="px-4 py-4 font-body text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p>
                    <span className="font-mono text-xs text-slate">{quote.reference}</span>{" "}
                    <span className="font-semibold text-basalt">{quote.projectName ?? quote.deliveryAddress}</span>
                  </p>
                  <span className="font-mono text-[11px] text-seam-blue">{QUOTE_STATUS_LABEL[quote.status]}</span>
                </div>
                <p className="mt-1 text-slate">
                  {quote.lineItems.map((l) => `${l.quantity} ${UNIT_LABEL[l.unitOfSale]} ${l.product.name}`).join(" · ")}
                </p>
                <p className="mt-1 text-xs text-slate">
                  Requested {formatDate(quote.createdAt)}
                  {quote.estimatedSubtotal && ` · materials est. ${formatZAR(Number(quote.estimatedSubtotal))}`}
                </p>
                {quote.quotedTotal && (
                  <div className="mt-3 flex flex-wrap items-center gap-3 rounded-sm bg-limestone p-3">
                    <p>
                      Delivered price: <strong>{formatZAR(Number(quote.quotedTotal))}</strong>
                      {quote.staffNotes && <span className="block text-xs text-slate">{quote.staffNotes}</span>}
                    </p>
                    {quote.status === "QUOTED" && (
                      <div className="ml-auto flex gap-2">
                        {(["ACCEPT", "DECLINE"] as const).map((decision) => (
                          <form key={decision} action={respondToQuote}>
                            <input type="hidden" name="id" value={quote.id} />
                            <input type="hidden" name="decision" value={decision} />
                            <button
                              className={`rounded-sm px-3 py-1.5 text-xs font-semibold ${
                                decision === "ACCEPT" ? "bg-seam-blue text-limestone" : "border border-basalt/20 text-basalt"
                              }`}
                            >
                              {decision === "ACCEPT" ? "Accept quote" : "Decline"}
                            </button>
                          </form>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {dashboard && (
        <>
          <section id="orders" className={`mt-8 overflow-x-auto ${card}`}>
            <h2 className="border-b border-basalt/10 px-4 py-3 font-body text-sm font-semibold text-basalt">Recent orders</h2>
            {dashboard.orders.length === 0 ? (
              <p className="p-4 font-body text-sm text-slate">No orders yet — accepted quotes become orders once confirmed by our team.</p>
            ) : (
              <table className="w-full min-w-[560px] font-body text-sm">
                <thead>
                  <tr className="border-b border-basalt/10 text-left text-xs text-slate">
                    <th className="px-4 py-2">Order #</th>
                    <th>Date</th>
                    <th>Products</th>
                    <th>Status</th>
                    <th className="pr-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.orders.map((order) => (
                    <tr key={order.id} className="border-b border-basalt/5">
                      <td className="px-4 py-3 font-mono text-xs">{order.orderNumber}</td>
                      <td>{formatDate(order.createdAt)}</td>
                      <td>{order.lineItems.map((l) => l.product.name).join(", ")}</td>
                      <td>{order.status}</td>
                      <td className="pr-4 text-right">{formatZAR(Number(order.total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section id="addresses" className={`mt-8 ${card}`}>
            <h2 className="border-b border-basalt/10 px-4 py-3 font-body text-sm font-semibold text-basalt">Delivery addresses</h2>
            <div className="grid gap-6 p-4 md:grid-cols-2">
              <ul className="space-y-3 font-body text-sm">
                {dashboard.deliveryAddresses.length === 0 && <li className="text-slate">No saved addresses yet.</li>}
                {dashboard.deliveryAddresses.map((a) => (
                  <li key={a.id} className="flex justify-between gap-3 rounded-sm bg-limestone p-3">
                    <span>
                      <strong className="text-basalt">{a.label}</strong>
                      {a.isDefault && <span className="ml-2 font-mono text-[10px] text-seam-blue">DEFAULT</span>}
                      <span className="block text-slate">
                        {[a.addressLine1, a.addressLine2, a.city, a.province, a.postalCode].filter(Boolean).join(", ")}
                      </span>
                    </span>
                    <form action={removeDeliveryAddress}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="text-xs text-slate hover:text-basalt" aria-label={`Remove ${a.label}`}>Remove</button>
                    </form>
                  </li>
                ))}
              </ul>
              <ActionForm action={addDeliveryAddress} className="grid gap-3 sm:grid-cols-2">
                <Field label="Label (e.g. Site A)" name="label" required />
                <Field label="Postal code" name="postalCode" required />
                <div className="sm:col-span-2"><Field label="Street address" name="addressLine1" required /></div>
                <Field label="City / town" name="city" required />
                <Field label="Province" name="province" required />
                <div className="sm:col-span-2"><SubmitButton variant="subtle">Save address</SubmitButton></div>
              </ActionForm>
            </div>
          </section>

          <section id="invoices" className={`mt-8 ${card}`}>
            <h2 className="border-b border-basalt/10 px-4 py-3 font-body text-sm font-semibold text-basalt">Invoices & statements</h2>
            {dashboard.invoices.length === 0 ? (
              <p className="p-4 font-body text-sm text-slate">No invoices yet.</p>
            ) : (
              <ul className="divide-y divide-basalt/5 font-body text-sm">
                {dashboard.invoices.map((inv) => (
                  <li key={inv.id} className="flex justify-between px-4 py-3">
                    <span className="font-mono text-xs">{inv.invoiceNumber}</span>
                    <span>{inv.status}</span>
                    <span>{formatZAR(Number(inv.amountDue))}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function StatusCards({ user, dashboard, quotes }: { user: SessionUser; dashboard: CompanyDashboard | null; quotes: QuoteRecord[] }) {
  const open = quotes.filter((q) => q.status === "SUBMITTED" || q.status === "QUOTED").length;
  const tierCard = !dashboard ? (
    <div>
      <p className="font-body text-sm font-semibold text-basalt">Retail (list price)</p>
      <Link href="/account/apply" className="mt-1 inline-block font-body text-xs font-semibold text-seam-blue hover:underline">
        Apply for trade pricing →
      </Link>
    </div>
  ) : dashboard.status === "PENDING" ? (
    <div>
      <p className="font-body text-sm font-semibold text-basalt">Retail — under review</p>
      <p className="font-body text-xs text-slate">
        Requested: {dashboard.requestedTier ? TIER_LABEL[dashboard.requestedTier.name] : "trade tier"}
      </p>
    </div>
  ) : dashboard.status === "DECLINED" ? (
    <div>
      <p className="font-body text-sm font-semibold text-basalt">Retail</p>
      <p className="font-body text-xs text-slate">Application declined{dashboard.reviewNotes ? ` — ${dashboard.reviewNotes}` : ""}</p>
    </div>
  ) : (
    <div>
      <p className="font-body text-sm font-semibold text-seam-blue">{TIER_LABEL[dashboard.tier.name]}</p>
      <p className="font-body text-xs text-slate">{Number(dashboard.tier.discountPercent)}% off list</p>
    </div>
  );

  const stats = [
    { label: "Account tier", body: tierCard },
    { label: "Open quotes", body: <p className="font-body text-sm font-semibold text-basalt">{open}</p> },
    { label: "Orders", body: <p className="font-body text-sm font-semibold text-basalt">{dashboard?.orders.length ?? 0}</p> },
    {
      label: "Standing agreement",
      body: <p className="font-body text-sm font-semibold text-basalt">{dashboard?.standingAgreementRef ?? "None"}</p>,
    },
  ];
  return (
    <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4" aria-label={`Account summary for ${user.email}`}>
      {stats.map((s) => (
        <div key={s.label} className={`${card} p-4`}>
          <p className="font-mono text-[10px] uppercase text-slate">{s.label}</p>
          <div className="mt-1">{s.body}</div>
        </div>
      ))}
    </div>
  );
}
