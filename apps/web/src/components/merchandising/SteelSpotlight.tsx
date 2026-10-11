import Link from "next/link";
import { CalculatorIcon } from "@/components/merchandising/CalculatorIcon";
import { STEEL_PRODUCTS } from "@/data/steel";
import { formatZAR } from "@/lib/pricing";

/** The steel most jobs need, in the order it's usually bought. Only lines with a benchmarked list price show. */
const PICKS = ["AA-STL-Y10", "AA-STL-Y12", "AA-STL-Y16", "AA-STL-MESH-193", "AA-STL-MESH-100", "AA-STL-BRICKFORCE-150", "AA-STL-ACC-TIE-WIRE"];
const MAX = 6;

const num = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 3 });

/**
 * Steel spotlight (STEEL_SPOTLIGHT.md): a homepage band for the steel line —
 * today's prices on the everyday rebar, mesh and brickforce, cut & bend to a
 * schedule, and the rebar mass calculator.
 */
export function SteelSpotlight({ hiddenSkus = [] }: { hiddenSkus?: string[] }) {
  const rows = PICKS.flatMap((sku) => {
    const p = STEEL_PRODUCTS.find((x) => x.sku === sku);
    const unit = p?.units.find((u) => u.prices !== null);
    if (!p || !unit?.prices || hiddenSkus.includes(sku)) return [];
    return [{ sku, slug: p.slug, name: p.name, mass: p.massKgPerM, price: unit.prices.RETAIL, unitLabel: unit.label.replace(/\s*\(.*\)$/, "") }];
  }).slice(0, MAX);

  return (
    <section aria-labelledby="steel-spotlight" className="border-y border-basalt/10 bg-limestone/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 lg:grid-cols-[1fr_1.3fr]">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-widest text-seam-blue">Reinforcing steel</p>
          <h2 id="steel-spotlight" className="mt-2 font-display text-2xl font-bold text-basalt md:text-3xl">
            Rebar and mesh with the rest of the order
          </h2>
          <p className="mt-3 font-body text-sm text-slate">
            SANS 920 Y-bar, SANS 1024 welded mesh and brickforce, ordered with your stone, cement and ready-mix and delivered by flatbed from merchants in our
            network.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/reinforcing-steel/cut-and-bend"
              className="group rounded-sm border border-basalt/10 bg-white p-4 transition hover:border-seam-blue hover:shadow-sm"
            >
              <p className="font-display text-sm font-semibold text-basalt group-hover:text-seam-blue">Cut &amp; bend to your schedule</p>
              <p className="mt-1 font-body text-xs text-slate">
                Send the bar bending schedule; get a written quote. Bars arrive cut, bent and tagged by bar mark.
              </p>
              <p className="mt-2 font-body text-xs font-semibold text-seam-blue">Send a schedule →</p>
            </Link>
            <Link
              href="/reinforcing-steel#bar-mass-calculator"
              className="group flex gap-3 rounded-sm border border-basalt/10 bg-white p-4 transition hover:border-seam-blue hover:shadow-sm"
            >
              <CalculatorIcon icon="steel" className="h-6 w-6 shrink-0 text-seam-blue" />
              <div>
                <p className="font-display text-sm font-semibold text-basalt group-hover:text-seam-blue">Rebar mass calculator</p>
                <p className="mt-1 font-body text-xs text-slate">Bars × length to kilograms, tonnes and 6 m stock lengths.</p>
                <p className="mt-2 font-body text-xs font-semibold text-seam-blue">Work out the steel →</p>
              </div>
            </Link>
          </div>
          <Link href="/reinforcing-steel" className="mt-5 inline-block font-body text-sm font-semibold text-seam-blue hover:underline">
            All reinforcing &amp; structural steel →
          </Link>
        </div>

        {rows.length > 0 && (
          <div className="min-w-0 rounded-sm border border-basalt/10 bg-white">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-basalt/10 px-4 py-3">
              <p className="font-display text-sm font-semibold text-basalt">Today&apos;s list prices</p>
              <p className="font-mono text-[10px] uppercase text-slate">Retail list · trade tiers pay less</p>
            </div>
            <ul className="divide-y divide-basalt/5">
              {rows.map((r) => (
                <li key={r.sku}>
                  <Link href={`/products/${r.slug}`} className="group flex items-center justify-between gap-4 px-4 py-3 hover:bg-limestone/50">
                    <span className="min-w-0">
                      <span className="block font-body text-sm font-semibold text-basalt group-hover:text-seam-blue">{r.name}</span>
                      {r.mass !== null && <span className="font-mono text-[11px] text-slate">{num(r.mass)} kg/m</span>}
                    </span>
                    <span className="shrink-0 text-right font-body text-sm text-basalt">
                      <strong>{formatZAR(r.price)}</strong>
                      <span className="block text-[11px] text-slate">per {r.unitLabel.toLowerCase()}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
