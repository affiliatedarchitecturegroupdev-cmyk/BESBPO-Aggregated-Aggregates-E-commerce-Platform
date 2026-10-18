import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExpressStatusCard } from "@/components/orders/ExpressStatusCard";
import { DeliveryPlanEditor } from "@/components/delivery/DeliveryPlanEditor";
import { DropList, ProofSummary } from "@/components/delivery/DropList";
import type { Deliveries } from "@/lib/phase4";
import { api } from "@/lib/api";
import { formatDate, type OrderRecord } from "@/lib/account-types";
import { formatZAR } from "@/lib/pricing";
import { requireSession, sessionToken } from "@/lib/session";

export const metadata: Metadata = { title: "Track your order", robots: { index: false } };

const STAGES = [
  { key: "PENDING", label: "Order received", detail: "We've received your order and are confirming it with the partner supplier." },
  { key: "CONFIRMED", label: "Confirmed with supplier", detail: "The partner supplier nearest your site is preparing your load." },
  { key: "IN_TRANSIT", label: "Out for delivery", detail: "Your load is on the way with Besfleet or one of our tipper partners." },
  { key: "DELIVERED", label: "Delivered", detail: "Delivered to site. Compliance documents are on your order record." },
] as const;

/** Order tracking from the real order record — the buyer's own, their company's, or any order for staff. */
export default async function OrderTrackingPage({ params }: { params: { id: string } }) {
  await requireSession(`/orders/${params.id}/tracking`);
  const result = await api<OrderRecord>(`/orders/${encodeURIComponent(params.id)}`, { token: sessionToken() });
  if (!result.ok) {
    if (result.status === 404) notFound();
    return <p className="mx-auto max-w-2xl px-4 py-12 font-body text-sm text-slate">{result.message}</p>;
  }
  const order = result.data;
  const plan = await api<Deliveries>(`/deliveries/orders/${encodeURIComponent(params.id)}`, { token: sessionToken() });
  const deliveries = plan.ok ? plan.data : null;
  const current = STAGES.findIndex((s) => s.key === order.status);
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/account/dashboard" className="hover:text-seam-blue">My account</Link> / Orders / {order.orderNumber}
      </nav>
      <h1 className="mt-4 font-display text-2xl font-bold text-basalt">
        Tracking <span className="font-mono">{order.orderNumber}</span>
      </h1>
      <p className="mt-1 font-body text-sm text-slate">
        Placed {formatDate(order.createdAt)} · {formatZAR(Number(order.total))} ·{" "}
        <Link href={`/orders/${order.id}/confirmation`} className="text-seam-blue hover:underline">Order details</Link>
      </p>

      {order.status === "CANCELLED" ? (
        <p className="mt-8 rounded-sm border border-red-700/30 bg-red-50 p-4 font-body text-sm text-red-800">This order was cancelled.</p>
      ) : (
        <ol className="mt-10">
          {STAGES.map((stage, i) => (
            <li key={stage.key} className="flex gap-4" aria-current={i === current ? "step" : undefined}>
              <div className="flex flex-col items-center">
                <div className={`h-4 w-4 rounded-full ${i <= current ? "bg-seam-blue" : "bg-basalt/20"}`} />
                {i < STAGES.length - 1 && <div className={`h-12 w-0.5 ${i < current ? "bg-seam-blue" : "bg-basalt/20"}`} />}
              </div>
              <div className="pb-8">
                <p className={`font-body text-sm font-semibold ${i <= current ? "text-basalt" : "text-slate"}`}>{stage.label}</p>
                {i === current && <p className="mt-1 font-body text-xs text-slate">{stage.detail}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}

      <ExpressStatusCard order={order} />
      {order.shipment && (
        <p className="rounded-sm bg-white p-4 font-body text-sm text-basalt">
          Carrier: {order.shipment.carrier === "BESFLEET" ? "Besfleet" : (order.shipment.externalPartnerName ?? "Delivery partner")}
          {order.shipment.trackingRef && (
            <>
              {" "}· Tracking reference <span className="font-mono">{order.shipment.trackingRef}</span>
            </>
          )}
        </p>
      )}
      {deliveries && order.status !== "CANCELLED" && (
        <section id="deliveries" className="mt-8 scroll-mt-24 rounded-sm border border-basalt/10 bg-white p-5" aria-labelledby="deliveries-heading">
          <h2 id="deliveries-heading" className="font-body text-sm font-semibold text-basalt">
            {deliveries.isPhased ? `Delivery plan — ${deliveries.drops.filter((d) => d.status !== "CANCELLED").length} drops` : "Delivery"}
          </h2>
          {deliveries.isPhased && <div className="mt-3"><DropList deliveries={deliveries} /></div>}
          {!deliveries.isPhased && deliveries.proof && <ProofSummary proof={deliveries.proof} />}
          {deliveries.canPlan ? (
            <details className="mt-4">
              <summary className="cursor-pointer font-body text-sm text-seam-blue">
                {deliveries.isPhased ? "Change the delivery plan" : "Deliver in stages instead — plan phased deliveries"}
              </summary>
              <p className="mt-2 font-body text-xs text-slate">
                Split your order into dated drops — for example, bricks for each stage of the build. Dates are from tomorrow up to a year ahead; we confirm
                each one with the supplier. Each drop leaves once what you&apos;ve paid covers it (the delivery fee with the first drop), or straight away on a trade
                account. Extra drops may carry their own delivery charge, which we&apos;d agree with you first.
              </p>
              <div className="mt-3"><DeliveryPlanEditor deliveries={deliveries} /></div>
            </details>
          ) : (
            deliveries.planBlockedReason && deliveries.isPhased && <p className="mt-3 font-body text-xs text-slate">{deliveries.planBlockedReason}</p>
          )}
        </section>
      )}

      <p className="mt-4 font-mono text-[11px] text-slate">
        Delivery is dispatched by Besfleet or one of our 15+ tipper partners depending on route and load; a tracking
        reference appears here once dispatched.
      </p>
    </div>
  );
}
