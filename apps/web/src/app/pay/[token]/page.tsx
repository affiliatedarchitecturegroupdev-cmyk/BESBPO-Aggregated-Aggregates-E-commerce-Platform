import type { Metadata } from "next";
import Link from "next/link";
import { PaymentMethodSelector } from "@/components/payment/PaymentMethodSelector";
import { RefreshWhilePending } from "@/components/payment/RefreshWhilePending";
import { api } from "@/lib/api";
import { UNIT_LABEL, type PaymentTiles } from "@/lib/account-types";
import { formatZAR } from "@/lib/pricing";

export const metadata: Metadata = { title: "Pay for your order", robots: { index: false, follow: false } };

type LinkView = {
  orderNumber: string;
  customerName: string | null;
  kind: "FULL" | "DEPOSIT" | "BALANCE" | "INSTALMENT";
  amount: number;
  note: string | null;
  expiresAt: string;
  paid: boolean;
  total: number;
  amountPaid: number;
  balance: number;
  subtotal: number;
  deliveryFee: number;
  expressFee: number | null;
  ddpFee?: number | null;
  lines: { name: string; quantity: number; unitOfSale: keyof typeof UNIT_LABEL; lineTotal: number }[];
  methods: PaymentTiles;
};

const WHAT: Record<LinkView["kind"], string> = { FULL: "Order total", DEPOSIT: "Deposit", BALANCE: "Balance", INSTALMENT: "Part payment" };

/**
 * A payment link staff sent (docs/payments.md): the customer pays an order, a
 * deposit or a balance without signing in. The link is the key, so the page
 * shows only what's needed to pay — no address or contact details.
 */
export default async function PayPage({ params, searchParams }: { params: { token: string }; searchParams: { payment?: string } }) {
  const returned = searchParams.payment === "returned";
  const result = await api<LinkView>(`/payment-links/${encodeURIComponent(params.token)}${returned ? "/refresh" : ""}`, { method: returned ? "POST" : "GET" });
  if (!result.ok) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-basalt">This payment link can&apos;t be used</h1>
        <p className="mt-3 font-body text-sm text-slate">{result.message}</p>
        <Link href="/contact" className="mt-6 inline-block rounded-sm bg-seam-blue px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-basalt">
          Contact our team
        </Link>
      </div>
    );
  }
  const link = result.data;
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-seam-blue">Secure payment</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-basalt">{link.paid ? "Paid — thank you" : `Pay ${formatZAR(link.amount)}`}</h1>
        <p className="mt-2 font-body text-sm text-slate">
          Order <span className="font-mono text-basalt">{link.orderNumber}</span>
          {link.customerName && <> · for {link.customerName}</>}
        </p>
      </div>

      {returned && !link.paid && (
        <p role="status" className="mt-6 rounded-sm border border-seam-blue/30 bg-seam-blue/5 p-4 text-center font-body text-sm text-seam-blue">
          Thanks — your payment provider is confirming your payment. This page updates by itself once it does.
          <RefreshWhilePending />
        </p>
      )}
      {searchParams.payment === "cancelled" && !link.paid && (
        <p role="status" className="mt-6 rounded-sm border border-ochre-gold/50 bg-ochre-gold/10 p-4 text-center font-body text-sm text-basalt">
          Payment cancelled — you haven&apos;t been charged. Choose a way to pay below to try again.
        </p>
      )}
      {link.note && <p className="mt-6 rounded-sm border border-basalt/10 bg-white p-4 font-body text-sm text-basalt">{link.note}</p>}

      <div className="mt-6 rounded-sm border border-basalt/10 bg-white p-5 font-body text-sm">
        <ul className="divide-y divide-basalt/5">
          {link.lines.map((line, i) => (
            <li key={i} className="flex justify-between gap-4 py-2">
              <span>
                {line.quantity} {UNIT_LABEL[line.unitOfSale] ?? ""} — {line.name}
              </span>
              <span>{formatZAR(line.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-basalt/10 pt-3">
          <div className="flex justify-between">
            <dt className="text-slate">Materials</dt>
            <dd>{formatZAR(link.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate">Delivery</dt>
            <dd>{link.deliveryFee === 0 ? "Included" : formatZAR(link.deliveryFee)}</dd>
          </div>
          {link.ddpFee != null && link.ddpFee > 0 && (
            <div className="flex justify-between">
              <dt className="text-slate">Distributed delivery premium</dt>
              <dd>{formatZAR(link.ddpFee)}</dd>
            </div>
          )}
          {link.expressFee !== null && link.expressFee > 0 && (
            <div className="flex justify-between">
              <dt className="text-slate">AA 60/120 express</dt>
              <dd>{formatZAR(link.expressFee)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-slate">Order total</dt>
            <dd>{formatZAR(link.total)}</dd>
          </div>
          {link.amountPaid > 0 && (
            <div className="flex justify-between">
              <dt className="text-slate">Paid so far</dt>
              <dd>{formatZAR(link.amountPaid)}</dd>
            </div>
          )}
          <div className="flex justify-between font-semibold">
            <dt>{link.paid ? "Balance" : `${WHAT[link.kind]} to pay now`}</dt>
            <dd>{link.paid ? (link.balance > 0 ? formatZAR(link.balance) : "Paid in full") : formatZAR(link.amount)}</dd>
          </div>
        </dl>
      </div>

      {!link.paid && (
        <section className="mt-8" aria-label="Payment">
          <PaymentMethodSelector linkToken={params.token} eligible={link.methods} />
          <p className="mt-6 font-body text-xs text-slate">
            This link is valid until {new Date(link.expiresAt).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}. Need a
            document for your accounts team first?{" "}
            <a href={`/api/pay/${encodeURIComponent(params.token)}/proforma`} target="_blank" rel="noopener" className="text-seam-blue hover:underline">
              Download the proforma invoice (PDF)
            </a>
            .
          </p>
        </section>
      )}
    </div>
  );
}
