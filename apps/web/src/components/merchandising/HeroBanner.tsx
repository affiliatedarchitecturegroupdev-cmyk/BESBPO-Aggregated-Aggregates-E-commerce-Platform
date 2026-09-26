import Link from "next/link";
import { PRODUCTS } from "@/data/catalogue";

// Courses of the strata motif, top to bottom: each a material the platform sells.
const STRATA = [
  { label: "Decorative & landscaping", color: "#C08A34", width: "38%" },
  { label: "Sand & fine aggregates", color: "#D6BE8E", width: "52%" },
  { label: "Crushed stone", color: "#8C8A86", width: "66%" },
  { label: "Crusher run & base course", color: "#6F695F", width: "80%" },
  { label: "Sub-base & selected fill", color: "#2C4A5E", width: "94%" },
];

export function HeroBanner() {
  return (
    <section className="border-b border-basalt/10 bg-limestone">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2 md:items-center md:py-20">
        <div>
          <span className="inline-block rounded-sm bg-seam-blue/10 px-3 py-1 font-mono text-xs uppercase tracking-widest text-seam-blue">
            SANS / COLTO Graded
          </span>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-basalt md:text-5xl">
            Every Layer Starts Here.
          </h1>
          <p className="mt-4 max-w-md font-body text-base text-slate">
            Sub-base, crushed stone, sand and decorative aggregate — {PRODUCTS.length} graded materials priced by ton,
            m³ or bag, delivered by tipper across KZN and Gauteng from our approved partner-supplier network.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/products"
              className="rounded-sm bg-basalt px-6 py-3 font-body text-sm font-semibold text-limestone hover:bg-seam-blue"
            >
              Shop Products
            </Link>
            <Link
              href="/quote"
              className="rounded-sm border border-basalt px-6 py-3 font-body text-sm font-semibold text-basalt hover:bg-basalt hover:text-limestone"
            >
              Request a Bulk Quote
            </Link>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1.5" aria-hidden="true">
          {STRATA.map((layer) => (
            <div
              key={layer.label}
              className="flex h-12 items-center justify-center rounded-sm font-mono text-[10px] uppercase tracking-wider text-white/85"
              style={{ width: layer.width, backgroundColor: layer.color }}
            >
              {layer.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
