import type { Metadata } from "next";
import Link from "next/link";
import { CUSTOMER_TIERS, findProduct } from "@/data/catalogue";
import { formatZAR } from "@/lib/pricing";
import { SALES_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Trade Accounts",
  description: "Contractor/Trade (8% off) and Volume/Civil Bulk (15% off) accounts with standing addresses and PO billing.",
};

// Payment Strategy section of the platform spec, by tier.
const PAYMENT_OPTIONS: Record<string, string> = {
  RETAIL: "Card or instant EFT via PayFast; PayJustNow instalments",
  CONTRACTOR_TRADE: "PayFast, plus Lulapay buy-now-pay-later for trade",
  VOLUME_CIVIL_BULK: "EFT against purchase order on net terms, with monthly statements",
};

const BENEFITS = [
  { title: "Standing delivery addresses", body: "Save every site once; reorder without re-entering delivery and billing details." },
  { title: "Standing supply agreements", body: "Volume accounts can lock in supply for a project or season." },
  { title: "PO-based billing", body: "Volume/Civil Bulk accounts settle by purchase order and statement, not card." },
  { title: "One VAT-registered supplier", body: "Invoices are issued under Besbpo Group's company VAT registration." },
];

export default function TradeAccountsPage() {
  const example = findProduct("19mm-crushed-stone-dolomite")!;
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-seam-blue">Trade Accounts</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-basalt">Built for contractors and civil buyers</h1>
      <p className="mt-3 max-w-2xl font-body text-sm text-slate">
        Three customer tiers, each priced straight off the same list: register your company to see trade pricing
        applied across the catalogue and at checkout.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {CUSTOMER_TIERS.map((tier) => (
          <div
            key={tier.name}
            className={`flex flex-col rounded-sm border bg-white p-6 ${tier.name === "CONTRACTOR_TRADE" ? "border-seam-blue" : "border-basalt/10"}`}
          >
            <p className="font-display text-lg font-bold text-basalt">{tier.label}</p>
            <p className="mt-1 font-display text-3xl font-bold text-seam-blue">
              {tier.discount === 0 ? "List price" : `${Math.round(tier.discount * 100)}% off`}
            </p>
            <p className="mt-3 font-body text-sm text-slate">{tier.definition}</p>
            <p className="mt-4 font-mono text-[11px] text-slate">
              e.g. {example.name}: {formatZAR(example.prices[tier.name].ton ?? 0)}/ton
            </p>
            <p className="mt-4 flex-1 border-t border-basalt/10 pt-4 font-body text-xs text-slate">
              <span className="font-semibold text-basalt">Pay by: </span>
              {PAYMENT_OPTIONS[tier.name]}
            </p>
            {tier.quoteOnlyMinM3 !== null && (
              <p className="mt-3 font-body text-xs text-slate">
                Orders of {tier.quoteOnlyMinM3}m³ or more are quoted individually with delivered pricing.
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-4">
        {BENEFITS.map((b) => (
          <div key={b.title}>
            <p className="font-body text-sm font-semibold text-basalt">{b.title}</p>
            <p className="mt-1 font-body text-sm text-slate">{b.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-sm bg-basalt p-8 sm:flex-row sm:items-center">
        <div>
          <p className="font-display text-xl font-bold text-limestone">Open a trade account</p>
          <p className="mt-1 font-body text-sm text-limestone/70">
            Create an account, tell us about your company, and we review applications within one business day. You trade at
            list price until approved.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/account/apply"
            className="whitespace-nowrap rounded-sm bg-ochre-gold px-5 py-2.5 font-body text-sm font-semibold text-basalt"
          >
            Apply online
          </Link>
          <a
            href={`mailto:${SALES_EMAIL}?subject=${encodeURIComponent("Trade account enquiry")}`}
            className="whitespace-nowrap rounded-sm border border-limestone/40 px-5 py-2.5 font-body text-sm text-limestone"
          >
            Talk to sales
          </a>
        </div>
      </div>
    </div>
  );
}
