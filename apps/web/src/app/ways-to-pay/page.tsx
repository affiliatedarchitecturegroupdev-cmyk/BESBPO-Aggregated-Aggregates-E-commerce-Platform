import type { Metadata } from "next";
import Link from "next/link";
import { PAYMENT_METHODS } from "@/data/payment-methods";
import { PaymentLogo } from "@/components/payment/PaymentLogo";
import { apiCached } from "@/lib/api";
import { formatZAR } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Ways to Pay",
  description: "Card, instant EFT, wallets, QR, buy-now-pay-later, Lulapay trade credit and EFT / purchase order — every way to pay, with terms.",
  alternates: { canonical: "/ways-to-pay" },
};

const CATEGORY_LABELS: Record<string, string> = {
  card: "Cards",
  eft: "Instant EFT",
  wallet: "Digital Wallets",
  qr: "QR / Scan to Pay",
  bnpl: "Buy Now, Pay Later",
  b2b: "Trade Credit",
  manual: "Invoicing",
};

/**
 * Every payment method as its own standout entry with its researched terms
 * (PAYMENT_PROVIDER_TERMS.md). The gateway behind each one is backend-only.
 * Methods an admin has switched off drop out when the API can be reached.
 */
export default async function WaysToPayPage() {
  const enabled = await apiCached<{ methodKey: string }[]>("/payment-methods");
  const live = enabled ? new Set(enabled.map((m) => m.methodKey)) : null;
  const methods = PAYMENT_METHODS.filter((m) => !live || live.has(m.key));
  const groups = Object.keys(CATEGORY_LABELS)
    .map((category) => ({ category, label: CATEGORY_LABELS[category], methods: methods.filter((m) => m.category === category) }))
    .filter((g) => g.methods.length > 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / Ways to Pay
      </nav>
      <h1 className="mt-4 font-display text-3xl font-bold text-basalt">Ways to Pay</h1>
      <p className="mt-2 max-w-2xl font-body text-sm text-slate">
        Pay however suits your order — card, instant EFT, digital wallet, QR, buy-now-pay-later, or trade credit and
        invoicing for approved trade accounts. Every method is a real, standalone option, so you always know exactly how
        you&apos;re paying.
      </p>

      <div className="mt-10 space-y-10">
        {groups.map((group) => (
          <section key={group.category}>
            <h2 className="font-mono text-xs uppercase tracking-widest text-seam-blue">{group.label}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.methods.map((method) => (
                <div key={method.key} className="flex gap-4 rounded-sm border border-basalt/10 bg-white p-5">
                  <PaymentLogo method={method} size="md" decorative />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-body text-sm font-semibold text-basalt">{method.displayName}</p>
                      {method.tradeOnly && (
                        <span className="rounded-sm bg-ochre-gold/20 px-2 py-0.5 font-mono text-[9px] uppercase text-basalt">Trade accounts</span>
                      )}
                    </div>
                    {method.instalments && <p className="mt-1 font-body text-xs text-slate">{method.instalments}</p>}
                    {(method.minOrderValue || method.maxOrderValue) && (
                      <p className="mt-1 font-mono text-[10px] text-slate">
                        {method.minOrderValue ? `From ${formatZAR(method.minOrderValue)}` : ""}
                        {method.minOrderValue && method.maxOrderValue ? " · " : ""}
                        {method.maxOrderValue ? `up to ${formatZAR(method.maxOrderValue)}` : ""}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-12 rounded-sm bg-white p-4 font-body text-xs text-slate">
        The methods offered depend on your order value and account tier. Quote-only orders (Volume/Civil Bulk orders of
        10m³ or more, or delivery beyond 100km) are invoiced by EFT / purchase order. Instalment terms are the
        providers&apos; own and subject to their approval.{" "}
        <Link href="/trade-accounts" className="text-seam-blue hover:underline">Open a trade account</Link> for trade credit
        and invoicing.
      </p>
    </div>
  );
}
