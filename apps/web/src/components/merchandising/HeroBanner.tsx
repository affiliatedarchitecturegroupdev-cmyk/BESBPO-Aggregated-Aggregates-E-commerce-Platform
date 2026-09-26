import Link from "next/link";

export function HeroBanner() {
  return (
    <section className="border-b border-basalt/10 bg-limestone">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-2 md:items-center">
        <div>
          <span className="inline-block rounded-sm bg-seam-blue/10 px-3 py-1 font-mono text-xs uppercase tracking-widest text-seam-blue">
            SANS / COLTO Graded
          </span>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-basalt md:text-5xl">
            Every Layer Starts Here.
          </h1>
          <p className="mt-4 max-w-md font-body text-base text-slate">
            Sub-base, crushed stone, sand, and decorative aggregate — priced
            by ton or m³, sold bulk or bagged, delivered across KZN and
            Gauteng from our approved partner-supplier network.
          </p>
          <div className="mt-8 flex gap-4">
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
        <div className="flex h-64 items-center justify-center rounded-sm border border-dashed border-slate/40 bg-white/40 font-mono text-xs text-slate">
          [ hero imagery — stockpile / grading-curve brand motif ]
        </div>
      </div>
    </section>
  );
}
