import Link from "next/link";
import { api } from "@/lib/api";
import { adminCatalogue } from "@/lib/admin-data";
import type { Application, DocumentSummary, QuoteRecord } from "@/lib/account-types";
import { count as formatCount, insights, pct, randCompact, type Summary } from "@/lib/insights";
import { getSession, sessionToken } from "@/lib/session";
import type { Supplier } from "@/lib/suppliers";

export const metadata = { title: "Overview" };

export default async function AdminOverview() {
  const token = sessionToken();
  const user = await getSession();
  const isAdmin = user?.role === "ADMIN";
  const [applications, quotes, documents, catalogue, suppliers, chats, pendingOrders, confirmedOrders, failedMessages] = await Promise.all([
    api<Application[]>("/trade-accounts/applications?status=PENDING", { token }),
    api<QuoteRecord[]>("/quotes?status=SUBMITTED", { token }),
    api<DocumentSummary[]>("/compliance-documents/recent", { token }),
    adminCatalogue(),
    api<Supplier[]>("/suppliers?filter=active", { token }),
    api<unknown[]>("/channels/whatsapp/conversations", { token }),
    api<unknown[]>("/orders?status=PENDING", { token }),
    api<unknown[]>("/orders?status=CONFIRMED", { token }),
    api<unknown[]>("/notifications?status=FAILED", { token }),
  ]);
  const sales = await insights<Summary>("summary", { range: "30d" });
  const count = <T,>(r: { ok: true; data: T[] } | { ok: false }) => (r.ok ? String(r.data.length) : "—");
  const cards = [
    { href: "/admin/orders?status=PENDING", label: "Orders awaiting payment", value: count(pendingOrders) },
    { href: "/admin/orders?status=CONFIRMED", label: "Orders to dispatch", value: count(confirmedOrders) },
    { href: "/admin/notifications?status=FAILED", label: "Customer and staff messages that failed", value: count(failedMessages) },
    { href: "/admin/applications", label: "Trade applications awaiting review", value: count(applications) },
    { href: "/admin/quotes", label: "Quote requests awaiting a price", value: count(quotes) },
    { href: "/admin/documents", label: "Compliance documents (latest 100)", value: count(documents) },
    {
      href: "/admin/products",
      label: "Products hidden from the storefront",
      value: catalogue ? String(catalogue.filter((p) => !p.isActive).length) : "—",
    },
    {
      href: "/admin/products",
      label: "Products without live photography",
      value: catalogue ? String(catalogue.filter((p) => !p.images.some((i) => i.licence === "CLEARED")).length) : "—",
    },
    {
      href: "/admin/image-permissions",
      label: "Sourced photos awaiting permission",
      value: catalogue ? String(catalogue.reduce((n, p) => n + p.images.filter((i) => i.licence === "PERMISSION_PENDING" && !i.licenceName).length, 0)) : "—",
    },
    { href: "/admin/suppliers?filter=active", label: "Active partner suppliers", value: count(suppliers) },
    {
      href: "/admin/suppliers?filter=missing-coordinates",
      label: "Active suppliers without a map pin (not used for distances)",
      value: suppliers.ok ? String(suppliers.data.filter((s) => s.latitude === null).length) : "—",
    },
    { href: "/admin/whatsapp", label: "Open WhatsApp orders", value: count(chats) },
  ];
  const s = sales.ok ? sales.data.current : null;
  const tiles = s
    ? [
        { label: "Net revenue", value: randCompact(s.netRevenue) },
        { label: "Paid orders", value: formatCount(s.orders) },
        { label: "Hire commission", value: randCompact(s.hireCommission) },
        ...(isAdmin ? [{ label: "Gross margin", value: pct(s.grossMargin ?? null) }] : [{ label: "Paid hire bookings", value: formatCount(s.bookings) }]),
      ]
    : [];
  const links = [
    { href: "/admin/insights", label: "Sales dashboard (Insights)" },
    ...(isAdmin
      ? [
          { href: "/admin/insights/finance", label: "Profit & loss" },
          { href: "/admin/finance", label: "Finance set-up (costs, refunds, CSV import)" },
          { href: "/admin/insights/email", label: "Weekly email" },
        ]
      : []),
  ];
  return (
    <div className="space-y-6">
      <section className="rounded-sm border border-seam-blue/30 bg-white p-5" aria-labelledby="sales-at-a-glance">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="sales-at-a-glance" className="font-display text-lg font-bold text-basalt">
            Sales at a glance <span className="font-body text-xs font-normal text-slate">· last 30 days</span>
          </h2>
          <Link href="/admin/insights" className="font-body text-sm font-semibold text-seam-blue hover:underline">
            Open the sales dashboard →
          </Link>
        </div>
        {s ? (
          <dl className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {tiles.map((t) => (
              <div key={t.label} className="rounded-sm bg-limestone/60 p-3">
                <dt className="font-body text-xs text-slate">{t.label}</dt>
                <dd className="mt-0.5 font-display text-2xl font-semibold text-basalt">{t.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-3 font-body text-sm text-slate">Sales figures are unavailable right now.</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2 font-body text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-sm bg-seam-blue px-3 py-1.5 text-limestone hover:bg-basalt">
              {l.label}
            </Link>
          ))}
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Link key={card.label} href={card.href} className="rounded-sm border border-basalt/10 bg-white p-5 hover:border-seam-blue">
          <p className="font-display text-3xl font-bold text-basalt">{card.value}</p>
          <p className="mt-1 font-body text-sm text-slate">{card.label}</p>
        </Link>
      ))}
      </div>
    </div>
  );
}
