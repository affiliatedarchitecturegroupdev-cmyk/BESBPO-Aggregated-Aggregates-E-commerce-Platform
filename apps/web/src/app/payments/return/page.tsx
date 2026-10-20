import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { RefreshWhilePending } from "@/components/payment/RefreshWhilePending";
import { api } from "@/lib/api";
import { formatZAR } from "@/lib/pricing";

export const metadata: Metadata = { title: "Your payment", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type ReturnView = { status: "INITIATED" | "PAID" | "FAILED" | "CANCELLED" | "EXPIRED"; amount: number; orderId: string; orderNumber: string; orderStatus: string; viaLink: boolean };

/** Query parameters Stitch may add when it sends the customer back (their own IDs for the payment link). */
const LINK_ID_PARAMS = ["id", "paymentLinkId", "payment_link_id", "linkId", "link_id"];

/**
 * Where Stitch Express sends customers back (the one redirect URL registered
 * with Stitch; docs/payments-stitch.md). Finds the payment by our reference or
 * Stitch's link ID, asks Stitch how it stands, and shows the outcome — an
 * order is confirmed only on Stitch's word, never because the customer came
 * back. Shows no personal details.
 */
export default async function PaymentReturnPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const ref = first(searchParams.ref);
  const linkIds = LINK_ID_PARAMS.map((name) => first(searchParams[name])).filter((v): v is string => Boolean(v));
  const result = ref || linkIds.length ? await api<ReturnView>("/payment-methods/stitch/return", { method: "POST", body: { ref, linkIds } }) : null;

  if (!result?.ok) {
    return (
      <Shell eyebrow="Payment" title="We couldn't match this payment">
        <p className="font-body text-sm text-slate">
          If you paid, your order is confirmed as soon as Stitch tells us, and the receipt is emailed to you. You can check it under{" "}
          <Link href="/account/orders" className="text-seam-blue hover:underline">
            your orders
          </Link>
          , or contact our team with your order number.
        </p>
        <Actions orderHref="/account/orders" label="View your orders" />
      </Shell>
    );
  }

  const payment = result.data;
  const orderHref = `/orders/${payment.orderId}/confirmation`;
  if (payment.status === "PAID") {
    return (
      <Shell eyebrow="Payment received" title="Paid — thank you">
        <p className="font-body text-sm text-slate">
          Stitch confirmed your payment of <span className="font-semibold text-basalt">{formatZAR(payment.amount)}</span> for order{" "}
          <span className="font-mono text-basalt">{payment.orderNumber}</span>. Your receipt is on its way by email.
        </p>
        <Actions orderHref={payment.viaLink ? null : orderHref} />
      </Shell>
    );
  }
  if (payment.status === "INITIATED") {
    return (
      <Shell eyebrow="Checking your payment" title="Waiting for Stitch to confirm">
        <RefreshWhilePending />
        <p className="font-body text-sm text-slate">
          We&apos;re checking your payment of {formatZAR(payment.amount)} for order <span className="font-mono text-basalt">{payment.orderNumber}</span> with Stitch.
          This page updates on its own. Bank payments are usually confirmed within a minute; if you closed Stitch&apos;s page without paying, you can
          choose another way to pay from your order.
        </p>
        <Actions orderHref={payment.viaLink ? null : orderHref} />
      </Shell>
    );
  }
  return (
    <Shell eyebrow="Payment not completed" title="Nothing was charged">
      <p className="font-body text-sm text-slate">
        The payment for order <span className="font-mono text-basalt">{payment.orderNumber}</span> wasn&apos;t completed on Stitch&apos;s page. You can try
        again or choose another way to pay.
      </p>
      <Actions orderHref={payment.viaLink ? null : orderHref} retry />
    </Shell>
  );
}

function Shell({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-seam-blue">{eyebrow}</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-basalt">{title}</h1>
      <div className="mt-4 space-y-6">{children}</div>
    </div>
  );
}

/** A payment link's customer may not have an account, so they get the contact page rather than the order page. */
function Actions({ orderHref, retry = false, label }: { orderHref: string | null; retry?: boolean; label?: string }) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {orderHref ? (
        <Link href={orderHref} className="rounded-sm bg-seam-blue px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-basalt">
          {label ?? (retry ? "Choose how to pay" : "View your order")}
        </Link>
      ) : (
        <Link href="/contact" className="rounded-sm bg-seam-blue px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-basalt">
          {retry ? "Ask us for a new payment link" : "Contact our team"}
        </Link>
      )}
      <Link href="/" className="rounded-sm border border-basalt/20 px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:border-seam-blue">
        Back to the store
      </Link>
    </div>
  );
}
