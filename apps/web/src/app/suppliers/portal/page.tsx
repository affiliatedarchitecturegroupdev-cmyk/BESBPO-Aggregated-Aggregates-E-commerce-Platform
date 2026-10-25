import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/account-types";
import type { PortalOrder } from "@/lib/phase4";
import { requireSession, sessionToken } from "@/lib/session";

export const metadata: Metadata = { title: "Supplier portal", robots: { index: false } };
export const dynamic = "force-dynamic";

type Me = { supplier: { id: string; name: string; city: string; province: string }; counts: Record<string, number> };

const STATUS: Record<string, string> = { PENDING: "Awaiting payment", CONFIRMED: "Ready to load", IN_TRANSIT: "On its way", DELIVERED: "Delivered", CANCELLED: "Cancelled" };

function answer(o: PortalOrder) {
  if (o.supplierDeclinedAt) return { label: "You declined", tone: "text-red-700" };
  if (o.supplierAckAt) return { label: `You can load it${o.supplierReadyAt ? ` from ${formatDate(o.supplierReadyAt)}` : ""}`, tone: "text-emerald-700" };
  return { label: "Please answer", tone: "text-ochre-gold font-semibold" };
}

/** The supplier portal (docs/supplier-portal.md): orders our team has given this supplier to load. */
export default async function SupplierPortalPage({ searchParams }: { searchParams: { scope?: string } }) {
  const user = await requireSession("/suppliers/portal");
  if (user.role !== "SUPPLIER") notFound();
  const done = searchParams.scope === "done";
  const [me, orders] = await Promise.all([
    api<Me>("/supplier-portal/me", { token: sessionToken() }),
    api<PortalOrder[]>(`/supplier-portal/orders${done ? "?scope=done" : ""}`, { token: sessionToken() }),
  ]);
  if (!me.ok || !orders.ok) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-display text-2xl font-bold text-basalt">Supplier portal</h1>
        <p className="mt-3 font-body text-sm text-slate">{!me.ok ? me.message : !orders.ok ? orders.message : ""}</p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <p className="font-mono text-xs uppercase text-slate">Supplier portal</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-basalt">{me.data.supplier.name}</h1>
      <p className="mt-1 font-body text-sm text-slate">
        {me.data.supplier.city}, {me.data.supplier.province}. Orders our team has given you to load. Tell us whether you can load each one and from when;
        questions about an order go to our sales team.
      </p>
      <nav className="mt-6 flex gap-2 font-body text-sm">
        <Link href="/suppliers/portal" aria-current={!done ? "page" : undefined} className={`rounded-sm px-3 py-1.5 ${!done ? "bg-basalt text-limestone" : "border border-basalt/20 bg-white"}`}>Open</Link>
        <Link href="/suppliers/portal?scope=done" aria-current={done ? "page" : undefined} className={`rounded-sm px-3 py-1.5 ${done ? "bg-basalt text-limestone" : "border border-basalt/20 bg-white"}`}>Delivered and closed</Link>
        <Link href="/suppliers/portal/prices" className="rounded-sm border border-basalt/20 bg-white px-3 py-1.5">Your price list</Link>
      </nav>
      {orders.data.length === 0 ? (
        <p className="mt-6 font-body text-sm text-slate">No {done ? "closed" : "open"} orders.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.data.map((o) => {
            const a = answer(o);
            return (
              <li key={o.id} className="rounded-sm border border-basalt/10 bg-white p-4 font-body text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link href={`/suppliers/portal/orders/${o.id}`} className="font-mono font-semibold text-seam-blue hover:underline">{o.orderNumber}</Link>
                  <span className="font-mono text-[11px] uppercase text-slate">{STATUS[o.status] ?? o.status}{o.isPhased ? ` · ${o.drops.length} drops` : ""}</span>
                </div>
                <p className="mt-1 text-xs text-slate">{o.lineItems.map((l) => `${l.quantity} × ${l.name}`).join(" · ")}</p>
                <p className="mt-1 text-xs text-slate">{o.deliveryProvince ?? ""}</p>
                {!done && <p className={`mt-1 text-xs ${a.tone}`}>{a.label}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
