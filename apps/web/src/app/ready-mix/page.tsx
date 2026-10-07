import type { Metadata } from "next";
import Link from "next/link";
import { formatZAR } from "@/lib/pricing";
import { isPumpPriced, PUMP_OPTIONS, READY_MIX_PRODUCTS } from "@/data/ready-mix";

export const metadata: Metadata = {
  title: "Ready-Mix Concrete — 10 to 40 MPa, by the m³",
  description:
    "Ready-mix concrete from 10 to 40 MPa delivered by truck mixer from partner batching plants, with concrete pump hire. Choose the right strength grade, check minimum loads and order by the m³.",
  alternates: { canonical: "/ready-mix" },
};

const GRADES = [...READY_MIX_PRODUCTS].sort((a, b) => a.strengthGradeMPa - b.strengthGradeMPa);

/** Landing page for CAT-12 ready-mix (READY_MIX_CATALOGUE.md): live prices only where benchmarked; pumps quoted unless priced. */
export default function ReadyMixPage() {
  return (
    <div>
      <section className="bg-basalt text-limestone">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <nav className="font-mono text-xs text-limestone/60" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ochre-gold">Home</Link> / Ready-Mix Concrete
          </nav>
          <p className="mt-6 font-mono text-xs uppercase tracking-widest text-ochre-gold">Truck-mixer delivery · by the m³</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight md:text-5xl">Ready-mix concrete, batched near your site</h1>
          <p className="mt-4 max-w-2xl font-body text-base text-limestone/80">
            {GRADES.length} strength grades from {GRADES[0]?.strengthGradeMPa} to {GRADES[GRADES.length - 1]?.strengthGradeMPa} MPa, from partner batching
            plants — with concrete pumps when the truck can&apos;t reach the pour.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/products?category=ready-mix-concrete" className="rounded-sm bg-ochre-gold px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:bg-limestone">
              Shop ready-mix
            </Link>
            <Link href="/estimator?job=slab" className="rounded-sm border border-limestone/30 px-5 py-2.5 font-body text-sm font-semibold hover:border-ochre-gold">
              Work out how much you need
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-basalt">Choose the strength grade</h2>
        <p className="mt-1 max-w-2xl font-body text-sm text-slate">
          The grade is the concrete&apos;s compressive strength at 28 days. Structural work follows your engineer&apos;s specification.
        </p>
        <div className="mt-5 overflow-x-auto rounded-sm border border-basalt/10 bg-white">
          <table className="w-full min-w-[36rem] font-body text-sm">
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase text-slate">
                <th className="px-4 py-2">Grade</th>
                <th className="px-4 py-2">Typical uses</th>
                <th className="px-4 py-2">Minimum load</th>
                <th className="px-4 py-2 text-right">Price per m³</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-basalt/10">
              {GRADES.map((g) => {
                const price = g.units[0].prices?.RETAIL ?? null;
                return (
                  <tr key={g.sku} className="align-top text-basalt">
                    <td className="px-4 py-3">
                      <Link href={`/products/${g.slug}`} className="font-semibold text-seam-blue hover:underline">{g.strengthGradeMPa} MPa</Link>
                      <span className="block font-mono text-[10px] text-slate">{g.mixType}</span>
                    </td>
                    <td className="px-4 py-3 text-slate">{g.typicalUses.slice(0, 3).join(" · ")}</td>
                    <td className="px-4 py-3">{g.minimumLoadM3} m³</td>
                    <td className="px-4 py-3 text-right">{price !== null ? <strong>{formatZAR(price)}</strong> : <span className="text-slate">On request</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <section className="mt-14 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-xl font-bold text-basalt">Concrete pumps</h2>
            <p className="mt-2 font-body text-sm text-slate">
              If the truck mixer can&apos;t get close to the pour — upper floors, back gardens, long reaches — add a pump. Pumps are booked with the concrete.
            </p>
            <ul className="mt-3 divide-y divide-basalt/10 rounded-sm border border-basalt/10 bg-white font-body text-sm">
              {PUMP_OPTIONS.map((p) => (
                <li key={p.code} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                  <span className="text-basalt">
                    {p.name}
                    {p.capacityM3PerHr ? <span className="ml-2 text-xs text-slate">~{p.capacityM3PerHr} m³/hr</span> : null}
                  </span>
                  <span className="text-xs text-slate">{isPumpPriced(p) ? "Priced on the product page" : "Quoted"}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-basalt">Before your pour</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 font-body text-sm text-basalt">
              <li>Order a little over your calculated volume — spillage, uneven ground and formwork take some. The calculator on each grade&apos;s page helps.</li>
              <li>Check the minimum load for your grade; smaller pours may suit bagged cement and aggregates instead.</li>
              <li>Have formwork, reinforcement and labour ready before the truck arrives — concrete has a limited working time.</li>
              <li>Make sure a truck mixer can reach the site, or book a pump.</li>
            </ul>
          </div>
        </section>

        <section className="mt-14 flex flex-col items-start justify-between gap-4 rounded-sm border border-seam-blue/20 bg-seam-blue/5 p-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-lg font-bold text-basalt">Pouring a slab or foundation?</h2>
            <p className="mt-1 font-body text-sm text-slate">The Foundation &amp; Slab job pack adds the hardcore, blinding sand, TLB and pump to your concrete — one request, one quote.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/job-packs#foundation-and-slab" className="rounded-sm bg-seam-blue px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-basalt">See the job pack</Link>
            <Link href="/cement" className="rounded-sm border border-basalt/20 px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:border-seam-blue">Bagged cement</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
