import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PaymentMethodSelector, type EligibleMethods } from "@/components/payment/PaymentMethodSelector";
import { api } from "@/lib/api";
import { UNIT_LABEL, type OrderRecord } from "@/lib/account-types";
import { formatZAR } from "@/lib/pricing";
import { requireSession, sessionToken } from "@/lib/session";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

/**
 * Order confirmation — where a payment gateway returns the buyer, and where a
 * PENDING order is paid. Only the buyer, their company or staff can see it.
 */
export default async function OrderConfirmationPage({ params }: { params: { id: string } }) {
  await requireSession(`/orders/${params.id}/confirmation`);
  const token = sessionToken();
  const result = await api<OrderRecord>(`/orders/${encodeURIComponent(params.id)}`, { token });
  if (!result.ok) {
    if (result.status === 404) notFound();
    return <p className="mx-auto max-w-2xl px-4 py-12 font-body text-sm text-slate">{result.message}</p>;
  }
  const order = result.data;
  const awaitingPayment = order.status === "PENDING";
  const eligible = awaitingPayment
    ? await api<EligibleMethods>(`/payment-methods/eligible?orderTotal=${Number(order.total)}`, { token })
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-seam-blue/10 font-display text-2xl text-seam-blue" aria-hidden="true">
          ✓
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-basalt">
          {awaitingPayment ? "Order placed — choose how to pay" : "Order confirmed"}
        </h1>
        <p className="mt-2 font-body text-sm text-slate">
          Order reference <span className="font-mono text-basalt">{order.orderNumber}</span>
        </p>
      </div>

      <div className="mt-8 rounded-sm border border-basalt/10 bg-white p-5 font-body text-sm">
        <ul className="divide-y divide-basalt/5">
          {order.lineItems.map((line, i) => (
            <li key={line.id ?? i} className="flex justify-between gap-4 py-2">
              <span>
                {line.quantity} {line.unitOfSale ? UNIT_LABEL[line.unitOfSale] : ""} — {line.product.name}
              </span>
              {line.lineTotal && <span>{formatZAR(Number(line.lineTotal))}</span>}
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-basalt/10 pt-3">
          <div className="flex justify-between">
            <dt className="text-slate">Materials</dt>
            <dd>{formatZAR(Number(order.subtotal))}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate">Delivery</dt>
            <dd>{Number(order.deliveryFee) === 0 ? "Included" : formatZAR(Number(order.deliveryFee))}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>Total</dt>
            <dd>{formatZAR(Number(order.total))}</dd>
          </div>
        </dl>
      </div>

      {awaitingPayment && (
        <section className="mt-8" aria-label="Payment">
          {eligible?.ok ? (
            <PaymentMethodSelector orderId={order.id} eligible={eligible.data} />
          ) : (
            <p className="font-body text-sm text-slate">Payment options couldn&apos;t be loaded — please try again shortly.</p>
          )}
        </section>
      )}

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href={`/orders/${order.id}/tracking`} className="rounded-sm bg-seam-blue px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-basalt">
          Track this order
        </Link>
        <Link href="/products" className="rounded-sm border border-basalt px-5 py-2.5 font-body text-sm text-basalt hover:bg-basalt hover:text-limestone">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
