import Link from "next/link";
import { PROVINCES, type Coverage } from "@/lib/suppliers";

/**
 * Delivery footprint: we deliver in all nine provinces. Each chip shows how
 * many active partner suppliers serve it (from the supplier network) when
 * coverage can be loaded.
 */
export function CoverageStrip({ coverage }: { coverage: Coverage | null }) {
  const points = new Map((coverage?.provinces ?? []).map((p) => [p.province, p.deliveryPoints]));
  return (
    <section className="bg-white px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-seam-blue">Delivery Coverage</span>
            <h2 className="mt-1 font-display text-xl font-bold text-basalt">
              Delivering across all nine provinces
            </h2>
          </div>
          <p className="max-w-sm font-body text-xs text-slate">
            Besfleet plus 15+ external tipper-truck partners, delivering from the partner supplier nearest your site.{" "}
            <Link href="/coverage" className="text-seam-blue hover:underline">Check your town</Link> ·{" "}
            <Link href="/delivery-areas" className="text-seam-blue hover:underline">Delivery charges</Link>
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {PROVINCES.map((province) => (
            <Link
              key={province}
              href={`/coverage?province=${encodeURIComponent(province)}`}
              className="rounded-full border border-seam-blue bg-seam-blue/10 px-3 py-1 font-mono text-xs text-seam-blue hover:bg-seam-blue hover:text-limestone"
            >
              {province}
              {points.get(province) ? ` · ${points.get(province)} supplier${points.get(province) === 1 ? "" : "s"}` : " · Live"}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
