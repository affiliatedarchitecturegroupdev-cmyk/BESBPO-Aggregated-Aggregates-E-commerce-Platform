import type { Metadata } from "next";
import Link from "next/link";
import { AccountNav } from "@/components/account/AccountNav";
import { OrderCard } from "@/components/account/OrderCard";
import { api } from "@/lib/api";
import {
  formatDate,
  QUOTE_STATUS_LABEL,
  TIER_LABEL,
  UNIT_LABEL,
  type CompanyDashboard,
  type OrderRecord,
  type QuoteRecord,
} from "@/lib/account-types";
import { formatZAR } from "@/lib/pricing";
import { isStaff, requireSession, sessionToken, type SessionUser } from "@/lib/session";
import { logout, respondToQuote } from "../actions";

const INVOICE_STATUS_LABEL = { UNPAID: "Unpaid", PAID: "Paid", OVERDUE: "Overdue", VOID: "Void" } as const;

export const metadata: Metadata = { title: "Trade Account Dashboard", robots: { index: false } };

const card = "rounded-sm border border-basalt/10 bg-white";

/**
 * Module 4 dashboard (wireframe 05): tier status, quotes, recent orders and
 * tax invoices. Full order history is /account/orders; delivery sites, name
 * and password are /account/settings.
 */
export default async function DashboardPage({ searchParams }: { searchParams: { applied?: string } }) {
  const user = await requireSession("/account/dashboard");
  const token = sessionToken();
  const [company, quotes, ordersResult] = await Promise.all([
    api<CompanyDashboard | null>("/trade-accounts/me", { token }),
    api<QuoteRecord[]>("/quotes/mine", { token }),
    api<OrderRecord[]>("/orders/mine", { token }),
  ]);
  const orders = ordersResult.ok ? ordersResult.data : [];
  const invoices = orders.flatMap((order) => (order.invoice ? [{ order, invoice: order.invoice }] : []));
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
          {user.role === "PARTNER" && (
            <Link href="/partners/portal" className="rounded-sm bg-seam-blue px-4 py-2 font-body text-sm text-limestone hover:bg-basalt">
              Partner portal
            </Link>
          )}
          {isStaff(user) && (
            <Link href="/admin" className="rounded-sm bg-basalt px-4 py-2 font-body text-sm text-limestone hover:bg-seam-blue">
              Admin
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

      <AccountNav current="/account/dashboard" />

      <StatusCards user={user} dashboard={dashboard} quotes={quotes.ok ? quotes.data : []} orderCount={orders.length} />

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

      <section id="orders" className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-body text-sm font-semibold text-basalt">Recent orders</h2>
          <Link href="/account/orders" className="font-body text-xs font-semibold text-seam-blue hover:underline">All orders →</Link>
        </div>
        {orders.length === 0 ? (
          <p className={`mt-3 p-4 font-body text-sm text-slate ${card}`}>No orders yet — add materials to your cart, or request a quote for bulk and civil loads.</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {orders.slice(0, 3).map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </ul>
        )}
      </section>

      <section id="invoices" className={`mt-8 ${card}`}>
        <h2 className="border-b border-basalt/10 px-4 py-3 font-body text-sm font-semibold text-basalt">Tax invoices</h2>
        {invoices.length === 0 ? (
          <p className="p-4 font-body text-sm text-slate">No tax invoices yet — they appear here once our team issues them for an order.</p>
        ) : (
          <ul className="divide-y divide-basalt/5 font-body text-sm">
            {invoices.map(({ order, invoice }) => (
              <li key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <a href={`/api/orders/${order.id}/documents/invoice`} target="_blank" rel="noopener" className="font-mono text-xs text-seam-blue hover:underline">
                  {invoice.invoiceNumber} (PDF)
                </a>
                <span className="text-xs text-slate">Order {order.orderNumber}</span>
                <span className="text-xs">{INVOICE_STATUS_LABEL[invoice.status]}</span>
                <span>{formatZAR(Number(invoice.amountDue ?? order.total))}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 font-body text-sm text-slate">
        Delivery sites, your name and password are in{" "}
        <Link href="/account/settings" className="font-semibold text-seam-blue hover:underline">account settings</Link>.
      </p>
    </div>
  );
}
function StatusCards({
  user,
  dashboard,
  quotes,
  orderCount,
}: {
  user: SessionUser;
  dashboard: CompanyDashboard | null;
  quotes: QuoteRecord[];
  orderCount: number;
}) {
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
    { label: "Orders", body: <p className="font-body text-sm font-semibold text-basalt">{orderCount}</p> },
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
