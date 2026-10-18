import type { Metadata } from "next";
import Link from "next/link";
import { CUSTOMER_TIERS, findProduct } from "@/data/catalogue";
import { PROJECT_TOOLS } from "@/components/merchandising/ProjectTools";
import { formatZAR } from "@/lib/pricing";
import { SALES_EMAIL } from "@/lib/site";
import { tierBreakdown, tierHeadline } from "@/lib/tier-pricing";

export const metadata: Metadata = {
  title: "Trade Accounts",
  description: "Contractor/Trade (up to 8% off) and Volume/Civil Bulk (up to 15% off) accounts with trade credit on account, BOQ quotes, phased deliveries and signed proof of delivery.",
};

// Payment Strategy section of the platform spec, by tier.
const PAYMENT_OPTIONS: Record<string, string> = {
  RETAIL: "Card or instant EFT via PayFast; PayJustNow instalments",
  CONTRACTOR_TRADE: "Every online method, Lulapay for trade, and trade credit on account once approved",
  VOLUME_CIVIL_BULK: "EFT against purchase order, or trade credit on account once approved",
};

const BENEFITS = [
  { title: "Standing delivery addresses", body: "Save every site once; reorder without re-entering delivery and billing details." },
  { title: "Standing supply agreements", body: "Volume accounts can lock in supply for a project or season." },
  { title: "PO-based billing", body: "Volume/Civil Bulk accounts settle by purchase order and statement, not card." },
  { title: "One VAT-registered supplier", body: "Invoices are issued under Besbpo Group's company VAT registration." },
];

// docs/trade-credit.md
const CREDIT_STEPS = [
  { title: "Apply", body: "Tell us the limit and terms you need (7, 14, 30 or 60 days), with two trade references and an accounts contact." },
  { title: "We decide", body: "We may check your references, then approve a limit and terms or decline — by email either way." },
  { title: "Order on account", body: "At checkout, choose Trade account. The order is confirmed and delivered now; the due date is on your confirmation." },
  { title: "Pay by the due date", body: "By EFT quoting the order number, or from the order page. Part payments count, and what you owe shows on your account page." },
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
              {tierHeadline(tier.name)}
            </p>
            <p className="mt-1 font-body text-xs text-slate">{tierBreakdown(tier.name)}</p>
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

      <section id="trade-credit" aria-labelledby="trade-credit-heading" className="mt-16 scroll-mt-24 grid gap-8 rounded-sm border border-basalt/10 bg-white p-8 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-seam-blue">Trade credit</p>
          <h2 id="trade-credit-heading" className="mt-2 font-display text-2xl font-bold text-basalt">Order now, pay on your terms</h2>
          <p className="mt-3 font-body text-sm text-slate">
            Once your trade account is approved, your company&apos;s account administrator can apply for credit from{" "}
            <Link href="/account/credit" className="text-seam-blue hover:underline">My account → Trade credit</Link>. We review every application and set
            a limit and terms; terms are in section 4A of our{" "}
            <Link href="/legal/terms-and-conditions" className="text-seam-blue hover:underline">Terms &amp; Conditions</Link>.
          </p>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2">
          {CREDIT_STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-seam-blue/50 font-mono text-xs text-seam-blue">{i + 1}</span>
              <div>
                <p className="font-body text-sm font-semibold text-basalt">{step.title}</p>
                <p className="mt-0.5 font-body text-xs text-slate">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="deliveries" aria-labelledby="project-tools-heading" className="mt-16 scroll-mt-24">
        <p className="font-mono text-[11px] uppercase tracking-widest text-seam-blue">For projects</p>
        <h2 id="project-tools-heading" className="mt-2 font-display text-2xl font-bold text-basalt">From the BOQ to the last delivery</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROJECT_TOOLS.filter((t) => !t.href.startsWith("/trade-accounts#trade-credit")).map((tool) => (
            <div key={tool.title} className="rounded-sm border border-basalt/10 bg-white p-5">
              <p className="font-body text-sm font-semibold text-basalt">{tool.title}</p>
              <p className="mt-1 font-body text-sm text-slate">{tool.body}</p>
              {!tool.href.startsWith("/trade-accounts") && (
                <Link href={tool.href} className="mt-3 inline-block font-body text-xs font-semibold text-seam-blue hover:underline">{tool.cta} →</Link>
              )}
            </div>
          ))}
        </div>
      </section>

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
