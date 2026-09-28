import Link from "next/link";
import { PROVINCES, type Coverage } from "@/lib/suppliers";

const LAUNCH = ["Gauteng", "KwaZulu-Natal"];

/**
 * Delivery footprint: a province is live when it has an active partner
 * supplier (from the supplier network), falling back to the launch
 * provinces when coverage can't be loaded.
 */
export function CoverageStrip({ coverage }: { coverage: Coverage | null }) {
  const live = new Set(coverage && coverage.deliveryPoints > 0 ? coverage.provinces.map((p) => p.province) : LAUNCH);
  const ordered = [...PROVINCES.filter((p) => live.has(p)), ...PROVINCES.filter((p) => !live.has(p))];
  return (
    <section className="bg-white px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-seam-blue">Delivery Coverage</span>
            <h2 className="mt-1 font-display text-xl font-bold text-basalt">
              Live in {[...live].join(" & ")} — Expanding Nationwide
            </h2>
          </div>
          <p className="max-w-sm font-body text-xs text-slate">
            Besfleet plus 15+ external tipper-truck partners, delivering from the partner supplier nearest your site.{" "}
            <Link href="/delivery-areas" className="text-seam-blue hover:underline">Delivery areas & charges</Link>
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {ordered.map((province) => (
            <span
              key={province}
              className={`rounded-full border px-3 py-1 font-mono text-xs ${
                live.has(province) ? "border-seam-blue bg-seam-blue/10 text-seam-blue" : "border-slate/30 text-slate"
              }`}
            >
              {province}
              {live.has(province) ? " · Live" : " · Coming soon"}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
