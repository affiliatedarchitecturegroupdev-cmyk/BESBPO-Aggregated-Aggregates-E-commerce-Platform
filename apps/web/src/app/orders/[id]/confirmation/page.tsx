import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { orderDocuments } from "@/components/account/OrderCard";
import { ReorderButton } from "@/components/account/ReorderButton";
import { ProductThumb } from "@/components/product/ProductThumb";
import { findQuotable } from "@/data/quotable";
import { OrderPaymentPanel } from "@/components/payment/OrderPaymentPanel";
import { RefreshWhilePending } from "@/components/payment/RefreshWhilePending";
import { ExpressStatusCard } from "@/components/orders/ExpressStatusCard";
import { api } from "@/lib/api";
import { formatDate, UNIT_LABEL, type OrderPayments, type OrderRecord } from "@/lib/account-types";
import { getLeadTimes } from "@/lib/cms";
import { leadTimeLabel } from "@/lib/phase4";
import { formatZAR } from "@/lib/pricing";
import { requireSession, sessionToken } from "@/lib/session";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

/**
 * Order confirmation — where a payment gateway returns the buyer, and where a
 * PENDING order is paid. Only the buyer, their company or staff can see it.
 */
export default async function OrderConfirmationPage({ params, searchParams }: { params: { id: string }; searchParams: { payment?: string } }) {
  await requireSession(`/orders/${params.id}/confirmation`);
  const token = sessionToken();
  // Back from a gateway's page: ask the gateways how the payment stands first (Peach, Stitch and LayUp are checked directly).
  const returned = searchParams.payment === "returned";
  const cancelled = searchParams.payment === "cancelled";
  const payments = await api<OrderPayments>(`/payments/orders/${encodeURIComponent(params.id)}${returned ? "/refresh" : ""}`, { method: returned ? "POST" : "GET", token });
  const result = await api<OrderRecord>(`/orders/${encodeURIComponent(params.id)}`, { token });
  if (!result.ok) {
    if (result.status === 404) notFound();
    return <p className="mx-auto max-w-2xl px-4 py-12 font-body text-sm text-slate">{result.message}</p>;
  }
  const order = result.data;
  const awaitingPayment = order.status === "PENDING";
  const summary = payments.ok ? payments.data : null;
  const balanceDue = summary ? summary.balance > 0.01 && summary.amountPaid > 0 : false;
  const onLayby = summary?.layby.active?.status === "INITIATED";
  const onAccount = order.paymentPlan === "ACCOUNT";
  // The usual lead time: the longest of the order's categories, shown only when staff have set one for each.
  const leadTimes = await getLeadTimes();
  const slugs = [...new Set(order.lineItems.flatMap((l) => (l.product.sku ? (findQuotable(l.product.sku)?.categorySlug ?? []) : [])))];
  const lead = slugs.length && slugs.every((s) => leadTimes.has(s)) ? slugs.map((s) => leadTimes.get(s)!).reduce((a, b) => (b.maxDays > a.maxDays ? b : a)) : null;
  const showPayments = summary && order.status !== "CANCELLED" && (summary.choices.full || summary.choices.deposit || summary.choices.balance || summary.amountPaid > 0 || onLayby);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-seam-blue/10 font-display text-2xl text-seam-blue" aria-hidden="true">
          ✓
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-basalt">
          {onAccount ? "Order confirmed on your trade account" : onLayby ? "On lay-by — we deliver once it's paid off" : awaitingPayment ? "Order placed — choose how to pay" : balanceDue ? "Order confirmed — balance due before delivery" : "Order confirmed"}
        </h1>
        <p className="mt-2 font-body text-sm text-slate">
          Order reference <span className="font-mono text-basalt">{order.orderNumber}</span>
        </p>
      </div>

      {returned && awaitingPayment && !onLayby && (
        <p role="status" className="mt-6 rounded-sm border border-seam-blue/30 bg-seam-blue/5 p-4 text-center font-body text-sm text-seam-blue">
          Thanks — your payment provider is confirming your payment. This page updates by itself once it does, usually within a minute. If you paid with
          SCode, it updates once you&apos;ve paid in store.
          <RefreshWhilePending />
        </p>
      )}
      {returned && !awaitingPayment && (
        <p role="status" className="mt-6 rounded-sm border border-seam-blue/30 bg-seam-blue/5 p-4 text-center font-body text-sm text-seam-blue">
          Payment received — thank you. We&apos;ve emailed your confirmation.
        </p>
      )}
      {cancelled && awaitingPayment && (
        <p role="status" className="mt-6 rounded-sm border border-ochre-gold/50 bg-ochre-gold/10 p-4 text-center font-body text-sm text-basalt">
          Payment cancelled — you haven&apos;t been charged. Choose a way to pay below to try again.
        </p>
      )}

      <ExpressStatusCard order={order} />

      {onAccount && order.accountDueAt && (
        <p className="mt-6 rounded-sm border border-seam-blue/30 bg-seam-blue/5 p-4 text-center font-body text-sm text-seam-blue">
          Charged to your company&apos;s trade account — payment of {formatZAR(Number(order.total))} is due by {formatDate(order.accountDueAt)}. Pay by EFT with the
          order number as the reference, or below.
        </p>
      )}
      {!awaitingPayment && order.status !== "CANCELLED" && order.status !== "DELIVERED" && (
        <p className="mt-6 text-center font-body text-sm text-slate">
          {lead ? <>Usual lead time: {leadTimeLabel(lead)} from confirmation. </> : null}
          {order.isPhased ? "This order is delivered in stages — " : "Need it delivered in stages? "}
          <Link href={`/orders/${order.id}/tracking#deliveries`} className="text-seam-blue hover:underline">{order.isPhased ? "see your delivery plan" : "plan phased deliveries"}</Link>.
        </p>
      )}

      <div className="mt-8 rounded-sm border border-basalt/10 bg-white p-5 font-body text-sm">
        <ul className="divide-y divide-basalt/5">
          {order.lineItems.map((line, i) => (
            <li key={line.id ?? i} className="flex items-center justify-between gap-4 py-2">
              <span className="flex min-w-0 items-center gap-3">
                {line.product.sku && (
                  <ProductThumb sku={line.product.sku} categorySlug={findQuotable(line.product.sku)?.categorySlug ?? ""} name={line.product.name} className="h-10 w-10 shrink-0 rounded-sm" grains={12} />
                )}
                <span>
                  {line.quantity} {line.unitOfSale ? UNIT_LABEL[line.unitOfSale] : ""} — {line.product.name}
                </span>
              </span>
              {line.lineTotal && <span>{formatZAR(Number(line.lineTotal))}</span>}
            </li>
          ))}
        </ul>
        {order.deliveryAddress && (
          <p className="mt-3 border-t border-basalt/10 pt-3 text-slate">
            Delivering to {order.deliveryAddress}
            {order.deliveryProvince && `, ${order.deliveryProvince}`}
            {order.deliveryDistanceKm != null && ` · ${order.deliveryDistanceKm}km from our partner supplier (confirmed at dispatch)`}
          </p>
        )}
        <dl className="mt-3 space-y-1 border-t border-basalt/10 pt-3">
          <div className="flex justify-between">
            <dt className="text-slate">Materials</dt>
            <dd>{formatZAR(Number(order.subtotal))}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate">Delivery</dt>
            <dd>{Number(order.deliveryFee) === 0 ? "Included" : formatZAR(Number(order.deliveryFee))}</dd>
          </div>
          {Number(order.ddpFee ?? 0) > 0 && (
            <div className="flex justify-between">
              <dt className="text-slate">
                <Link href="/legal/shipping-delivery#2a-distributed-delivery-premium" className="hover:underline">
                  Distributed delivery premium
                </Link>
              </dt>
              <dd>{formatZAR(Number(order.ddpFee))}</dd>
            </div>
          )}
          {Number(order.expressFee ?? 0) > 0 && (
            <div className="flex justify-between">
              <dt className="text-slate">AA 60/120 express</dt>
              <dd>{formatZAR(Number(order.expressFee))}</dd>
            </div>
          )}
          <div className="flex justify-between font-semibold">
            <dt>Total</dt>
            <dd>{formatZAR(Number(order.total))}</dd>
          </div>
        </dl>
      </div>

      {showPayments && summary && (
        <section className="mt-8" aria-label="Payment">
          <OrderPaymentPanel payments={summary} />
        </section>
      )}
      {!summary && (awaitingPayment || order.status === "CONFIRMED") && (
        <p className="mt-8 font-body text-sm text-slate">Payment options couldn&apos;t be loaded — please try again shortly.</p>
      )}

      <section className="mt-8 rounded-sm border border-basalt/10 bg-white p-5 font-body text-sm" aria-labelledby="order-documents">
        <h2 id="order-documents" className="font-semibold text-basalt">Documents</h2>
        <ul className="mt-2 space-y-1">
          {orderDocuments(order).map((d) => (
            <li key={d.href}>
              <a href={d.href} target="_blank" rel="noopener" className="text-seam-blue hover:underline">{d.label}</a>
            </li>
          ))}
          {order.documents.map((doc) => (
            <li key={doc.id}>
              <a href={`/api/documents/${doc.id}`} target="_blank" rel="noopener" className="text-seam-blue hover:underline">{doc.title}</a>
              {doc.batchReference && <span className="text-xs text-slate"> · batch {doc.batchReference}</span>}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate">
          {order.invoice ? "" : "Your tax invoice appears here once our team issues it. "}
          {order.shipment ? "" : "The delivery note appears once your order is dispatched."}
        </p>
      </section>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href={`/orders/${order.id}/tracking`} className="rounded-sm bg-seam-blue px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-basalt">
          Track this order
        </Link>
        <Link href="/account/orders" className="rounded-sm border border-basalt px-5 py-2.5 font-body text-sm text-basalt hover:bg-basalt hover:text-limestone">
          All my orders
        </Link>
        <ReorderButton lines={order.lineItems.map((l) => ({ sku: l.product.sku, unitOfSale: l.unitOfSale, quantity: l.quantity, name: l.product.name }))} />
      </div>
    </div>
  );
}
