import Link from "next/link";
import { formatZAR } from "@/lib/pricing";

export type DdpView = {
  applies: boolean;
  fee: number;
  tier: "CONSOLIDATED" | "DUAL_ORIGIN" | "DISTRIBUTED";
  products: number;
  origins: { label: string; products: number }[];
  originFee: number;
  weightFee: number;
  extraHeavyTons: number;
  summary: string;
};

/**
 * The Distributed Delivery Premium line (docs/delivery-premium.md) for a
 * price summary: the amount, and — open on demand — where the order is
 * collected from and how the premium is made up.
 */
export function DeliveryPremiumRow({ ddp, estimate = false }: { ddp: DdpView | null | undefined; estimate?: boolean }) {
  if (!ddp?.applies || ddp.fee <= 0) return null;
  return (
    <div>
      <div className="flex justify-between">
        <dt className="text-slate">Distributed delivery premium</dt>
        <dd className="tabular-nums">{formatZAR(ddp.fee)}</dd>
      </div>
      <details className="mt-1 rounded-sm bg-limestone/70 px-2 py-1.5 text-xs text-slate">
        <summary className="cursor-pointer font-semibold text-seam-blue">Why? Collected from {ddp.origins.length} supply points</summary>
        <p className="mt-1">{ddp.summary}</p>
        <ul className="mt-1 list-disc pl-4">
          {ddp.origins.map((o, i) => (
            <li key={o.label}>
              {o.label} — {o.products} product{o.products === 1 ? "" : "s"}
              {i === 0 ? " (covered by the delivery fee)" : ""}
            </li>
          ))}
        </ul>
        <p className="mt-1">
          {formatZAR(ddp.originFee)} for the extra supply points
          {ddp.weightFee > 0 ? ` + ${formatZAR(ddp.weightFee)} for heavy goods from them` : ""}.
          {estimate ? " At checkout we check the partner suppliers near your site — if one stocks everything, it comes down." : ""}{" "}
          <Link href="/legal/shipping-delivery#2a-distributed-delivery-premium" className="font-semibold underline">
            How it works
          </Link>
        </p>
      </details>
    </div>
  );
}
