import type { Metadata } from "next";
import Link from "next/link";
import { AccountNav } from "@/components/account/AccountNav";
import { OrderCard } from "@/components/account/OrderCard";
import { api } from "@/lib/api";
import type { OrderRecord } from "@/lib/account-types";
import { requireSession, sessionToken } from "@/lib/session";

export const metadata: Metadata = { title: "Your orders", robots: { index: false } };

const FILTERS = [
  { key: "all", label: "All", match: () => true },
  { key: "open", label: "In progress", match: (o: OrderRecord) => o.status === "PENDING" || o.status === "CONFIRMED" || o.status === "IN_TRANSIT" },
  { key: "delivered", label: "Delivered", match: (o: OrderRecord) => o.status === "DELIVERED" },
  { key: "cancelled", label: "Cancelled", match: (o: OrderRecord) => o.status === "CANCELLED" },
] as const;

/** Order history for the signed-in customer (and their company): documents, tracking and reorder. */
export default async function OrdersPage({ searchParams }: { searchParams: { show?: string } }) {
  const user = await requireSession("/account/orders");
  const result = await api<OrderRecord[]>("/orders/mine", { token: sessionToken() });
  const filter = FILTERS.find((f) => f.key === searchParams.show) ?? FILTERS[0];
  const orders = result.ok ? result.data : [];
  const shown = orders.filter(filter.match);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="font-mono text-xs text-slate">{user.email}</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-basalt">Your orders</h1>
      <AccountNav current="/account/orders" />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 font-mono text-[11px]">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "all" ? "/account/orders" : `/account/orders?show=${f.key}`}
              aria-current={f.key === filter.key ? "page" : undefined}
              className={`rounded-sm px-2.5 py-1 ${f.key === filter.key ? "bg-basalt text-limestone" : "bg-white text-slate"}`}
            >
              {f.label} ({orders.filter(f.match).length})
            </Link>
          ))}
        </div>
        <Link href="/products" className="font-body text-xs font-semibold text-seam-blue hover:underline">Shop materials →</Link>
      </div>

      {!result.ok ? (
        <p className="mt-6 font-body text-sm text-slate">{result.message}</p>
      ) : shown.length === 0 ? (
        <p className="mt-6 rounded-sm border border-basalt/10 bg-white p-4 font-body text-sm text-slate">
          {orders.length === 0 ? "No orders yet. Add materials to your cart, or request a quote for bulk and civil loads." : "No orders here."}
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {shown.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </ul>
      )}
      <p className="mt-6 font-body text-xs text-slate">
        Showing your 50 most recent orders{user.company ? `, including ${user.company.name}'s` : ""}. Compliance documents appear on an order once our team attaches them.
      </p>
    </div>
  );
}
