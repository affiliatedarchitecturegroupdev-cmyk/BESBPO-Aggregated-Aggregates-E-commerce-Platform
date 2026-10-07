import Link from "next/link";
import { CUSTOMER_TIERS } from "@/data/catalogue";
import { tierBreakdown, tierHeadline } from "@/lib/tier-pricing";

const DETAIL: Record<string, string> = {
  RETAIL: "Walk-up and small online orders. No account required.",
  CONTRACTOR_TRADE: "Approved trade account for regular repeat orders, with saved delivery addresses.",
  VOLUME_CIVIL_BULK: "PO invoicing. Orders of 10m³ or more are quoted with delivered pricing.",
};

/** The three customer tiers, straight from the pricing framework workbook. */
export function TierComparison() {
  return (
    <section className="bg-limestone px-4 py-14">
      <div className="mx-auto max-w-6xl">
        <span className="font-mono text-xs uppercase tracking-widest text-seam-blue">Customer Tiers</span>
        <h2 className="mt-2 font-display text-2xl font-bold text-basalt">The More You Order, The More You Save</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {CUSTOMER_TIERS.map((tier) => (
            <div key={tier.name} className="rounded-sm border border-basalt/10 bg-white p-6">
              <h3 className="font-display text-lg font-semibold text-basalt">{tier.label}</h3>
              <p className="mt-1 font-mono text-sm text-ochre-gold">{tierHeadline(tier.name)}</p>
              <p className="mt-1 font-body text-xs text-slate">{tierBreakdown(tier.name)}</p>
              <p className="mt-3 font-body text-sm text-slate">{DETAIL[tier.name] ?? tier.definition}</p>
              <p className="mt-2 font-mono text-[10px] text-slate">{tier.definition}</p>
            </div>
          ))}
        </div>
        <Link href="/trade-accounts" className="mt-6 inline-block font-body text-sm font-semibold text-seam-blue hover:underline">
          Compare trade accounts →
        </Link>
      </div>
    </section>
  );
}
