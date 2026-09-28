import Link from "next/link";
import { api } from "@/lib/api";
import { adminCatalogue } from "@/lib/admin-data";
import type { Application, DocumentSummary, QuoteRecord } from "@/lib/account-types";
import { sessionToken } from "@/lib/session";
import type { Supplier } from "@/lib/suppliers";

export const metadata = { title: "Overview" };

export default async function AdminOverview() {
  const token = sessionToken();
  const [applications, quotes, documents, catalogue, suppliers, chats] = await Promise.all([
    api<Application[]>("/trade-accounts/applications?status=PENDING", { token }),
    api<QuoteRecord[]>("/quotes?status=SUBMITTED", { token }),
    api<DocumentSummary[]>("/compliance-documents/recent", { token }),
    adminCatalogue(),
    api<Supplier[]>("/suppliers?filter=active", { token }),
    api<unknown[]>("/channels/whatsapp/conversations", { token }),
  ]);
  const count = <T,>(r: { ok: true; data: T[] } | { ok: false }) => (r.ok ? String(r.data.length) : "—");
  const cards = [
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
      label: "Products without photography",
      value: catalogue ? String(catalogue.filter((p) => p.images.length === 0).length) : "—",
    },
    { href: "/admin/suppliers?filter=active", label: "Active partner suppliers", value: count(suppliers) },
    {
      href: "/admin/suppliers?filter=missing-coordinates",
      label: "Active suppliers without a map pin (not used for distances)",
      value: suppliers.ok ? String(suppliers.data.filter((s) => s.latitude === null).length) : "—",
    },
    { href: "/admin/whatsapp", label: "Open WhatsApp orders", value: count(chats) },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Link key={card.label} href={card.href} className="rounded-sm border border-basalt/10 bg-white p-5 hover:border-seam-blue">
          <p className="font-display text-3xl font-bold text-basalt">{card.value}</p>
          <p className="mt-1 font-body text-sm text-slate">{card.label}</p>
        </Link>
      ))}
    </div>
  );
}
