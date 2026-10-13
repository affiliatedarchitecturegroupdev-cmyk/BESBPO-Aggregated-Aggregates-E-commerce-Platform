import { DeliveryChecker } from "@/components/coverage/DeliveryChecker";
import { DELIVERY_RULES } from "@/data/catalogue";
import { CATEGORIES } from "@/data/categories";
import { COVERAGE_TOWNS } from "@/data/coverage-towns";
import { formatZAR } from "@/lib/pricing";

/** Each delivery band in words: included, or the per-load charge range. */
const BANDS = DELIVERY_RULES.bands.map((b) => {
  const fees = Object.values(b.fees).filter((f): f is number => typeof f === "number");
  const range = fees.length === 0 ? "delivery included in the list price" : `bulk delivery ${formatZAR(Math.min(...fees))}–${formatZAR(Math.max(...fees))} a load`;
  return { label: `${b.minKm}–${b.maxKm} km, ${range}`, minKm: b.minKm, maxKm: b.maxKm };
});

/** The public delivery checker: a full-width band on the homepage, or `bare` inside another page. */
export function DeliveryBand({ bare = false }: { bare?: boolean }) {
  const checker = (
    <DeliveryChecker
      towns={COVERAGE_TOWNS}
      materials={CATEGORIES.map((c) => ({ slug: c.slug, name: c.name }))}
      bands={BANDS}
      quoteOverKm={DELIVERY_RULES.quoteOverKm}
    />
  );
  if (bare) return checker;
  return (
    <section className="border-b border-basalt/10 bg-seam-blue/5 px-4 py-8">
      <div className="mx-auto max-w-6xl">{checker}</div>
    </section>
  );
}
