import Link from "next/link";
import { DEPARTMENTS } from "@/data/departments";
import { formatZAR } from "@/lib/pricing";
import { PRODUCT_INDEX } from "@/lib/product-index";

/** The building-supplies departments (CAT-32..42), with what each is deepest in. */
const SUPPLIES: { slug: string; points: string[] }[] = [
  { slug: "doors-windows", points: ["Steel windows, full FX7 schedule", "Wooden windows and sidelights", "Garage, sliding and security doors"] },
  { slug: "fencing-security", points: ["Mesh 0.9 to 2.4 m high", "Palisade and clear-view panels", "Gates, motors and burglar bars"] },
  { slug: "water-plumbing", points: ["Tanks 250 to 10,000 L", "Electric and solar geysers", "Polycop, copper, HDPE and uPVC"] },
  { slug: "ceilings-drywall", points: ["Gypsum: standard, moisture and fire", "Fibre-cement and PVC ceilings", "Cornices, studs and tracks"] },
  { slug: "tools-ppe", points: ["Bricklaying and plastering tools", "Boots, hard hats and harnesses", "First aid and site signage"] },
  { slug: "paint-waterproofing", points: ["Torch-on and liquid membranes", "Sealants and primers", "Wall, roof, floor and metal paint"] },
];

/**
 * Finish the build: the six building-supplies departments on the homepage —
 * product counts from the catalogue, and a line on what each is deepest in.
 */
export function FinishTheBuild({ hiddenSkus = [] }: { hiddenSkus?: string[] }) {
  const cards = SUPPLIES.flatMap(({ slug, points }) => {
    const d = DEPARTMENTS.find((x) => x.slug === slug);
    if (!d) return [];
    const products = PRODUCT_INDEX.filter((p) => p.departmentSlug === slug && !hiddenSkus.includes(p.sku));
    const priced = products.filter((p) => p.fromPrice !== null);
    const from = priced.length > 0 ? Math.min(...priced.map((p) => p.fromPrice!)) : null;
    return [{ d, points, count: products.length, priced: priced.length, from }];
  });
  const total = cards.reduce((n, c) => n + c.count, 0);

  return (
    <section aria-labelledby="finish-the-build" className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-seam-blue">Building supplies</p>
          <h2 id="finish-the-build" className="mt-2 font-display text-2xl font-bold text-basalt md:text-3xl">
            Finish the build with the same order
          </h2>
          <p className="mt-2 max-w-2xl font-body text-sm text-slate">
            Doors and windows, fencing, water and plumbing, ceilings, tools and PPE, waterproofing and paint — {total} products, delivered with your
            bulk materials or quoted to your schedule.
          </p>
        </div>
        <Link href="/departments" className="shrink-0 font-body text-sm text-seam-blue hover:underline">
          All departments →
        </Link>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ d, points, count, priced, from }) => (
          <Link key={d.slug} href={d.href} className="group flex flex-col rounded-sm border border-basalt/10 bg-white p-5 transition hover:border-seam-blue hover:shadow-sm">
            <h3 className="font-display text-base font-semibold text-basalt group-hover:text-seam-blue">{d.name}</h3>
            <ul className="mt-3 space-y-1">
              {points.map((point) => (
                <li key={point} className="flex gap-2 font-body text-xs text-slate">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ochre-gold" aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
            <p className="mt-auto pt-4 font-mono text-[10px] uppercase tracking-wide text-seam-blue">
              {count} products{priced > 0 ? ` · ${priced} buy online` : ""}
              {from !== null ? ` · from ${formatZAR(from)}` : ""}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
