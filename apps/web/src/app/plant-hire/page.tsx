import type { Metadata } from "next";
import Link from "next/link";
import { HireHowItWorks } from "@/components/plant/HowItWorks";
import { PlantCard } from "@/components/plant/PlantCard";
import { HOURS_PER_DAY_CAP, plantByClass } from "@/data/plant-services";
import { getHireCoverage, provinceSlug } from "@/lib/hire-coverage";

export const metadata: Metadata = {
  title: "Plant Hire — TLBs, Excavators, Tippers & Rollers",
  description:
    "Wet hire of TLBs, excavators from 1.7t to 30t, tipper trucks, rollers, loaders and water trucks across South Africa — machine, operator and fuel from vetted partners. Request a written quote.",
  alternates: { canonical: "/plant-hire" },
};

/** CAT-13 plant hire. Quote-only until partner rate cards are in (PLANT_HIRE_CATALOGUE.md). */
export const revalidate = 300;

export default async function PlantHirePage() {
  const groups = plantByClass();
  const coverage = await getHireCoverage();
  return (
    <div>
      <section className="bg-basalt text-limestone">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <nav className="font-mono text-xs text-limestone/60" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ochre-gold">Home</Link> / Plant Hire
          </nav>
          <p className="mt-6 font-mono text-xs uppercase tracking-widest text-ochre-gold">Wet hire · operator · fuel · PPE</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight md:text-5xl">Earthmoving plant, matched to your site</h1>
          <p className="mt-4 max-w-2xl font-body text-base text-limestone/80">
            TLBs, excavators, tippers and rollers from vetted partners near you — the same network that delivers your aggregates. Every hire is wet: the
            machine comes with an operator, fuel and PPE.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#machines" className="rounded-sm bg-ochre-gold px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:bg-limestone">
              Choose a machine
            </a>
            <Link href="/job-packs" className="rounded-sm border border-limestone/30 px-5 py-2.5 font-body text-sm font-semibold hover:border-ochre-gold">
              Need materials too? See job packs
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-sm border border-ochre-gold/40 bg-ochre-gold/10 p-4 font-body text-sm text-basalt">
          <strong>Quoted for now.</strong> We publish hire rates only once at least two partners in a province have given us written rate cards. Until then
          every request gets a written quote from us.
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3"><h2 className="mt-12 font-display text-2xl font-bold text-basalt">How it works</h2><Link href="/plant-hire/how-it-works" className="font-body text-sm font-semibold text-seam-blue hover:underline">The full step-by-step →</Link></div>
        <div className="mt-5">
          <HireHowItWorks />
        </div>

        <div id="machines" className="scroll-mt-24">
          {groups.map((g) => (
            <section key={g.plantClass} className="mt-12">
              <h2 className="font-display text-xl font-bold text-basalt">{g.label}</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {g.items.map((item) => (
                  <PlantCard key={item.sku} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {coverage.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display text-xl font-bold text-basalt">Where our partners are active</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {coverage.map((c) => (
                <Link key={c.province} href={`/plant-hire/areas/${provinceSlug(c.province)}`} className="rounded-sm border border-basalt/15 bg-white px-3 py-1.5 font-body text-sm text-basalt hover:border-seam-blue">
                  {c.province}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-14 grid gap-6 md:grid-cols-3">
          <div className="rounded-sm border border-basalt/10 bg-white p-5">
            <h3 className="font-display text-base font-semibold text-basalt">The hire day</h3>
            <p className="mt-2 font-body text-sm text-slate">
              A hire day is up to {HOURS_PER_DAY_CAP} machine hours. Extra hours and standing time are quoted at the partner&apos;s excess rate.
            </p>
          </div>
          <div className="rounded-sm border border-basalt/10 bg-white p-5">
            <h3 className="font-display text-base font-semibold text-basalt">Getting it to site</h3>
            <p className="mt-2 font-body text-sm text-slate">
              Mobilisation depends on distance; large excavators and rollers travel on a lowbed. Sites more than 100km from the partner are always quoted.
            </p>
          </div>
          <div className="rounded-sm border border-basalt/10 bg-white p-5">
            <h3 className="font-display text-base font-semibold text-basalt">Long-term hire</h3>
            <p className="mt-2 font-body text-sm text-slate">Monthly and contract hire is negotiated per job. Tell us the duration and we&apos;ll put it to our partners.</p>
          </div>
        </section>

        <section className="mt-14 flex flex-col items-start justify-between gap-4 rounded-sm border border-seam-blue/20 bg-seam-blue/5 p-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-lg font-bold text-basalt">Only need a compactor or a generator?</h2>
            <p className="mt-1 font-body text-sm text-slate">Small equipment and scaffolding are dry hire — no operator — with a refundable deposit.</p>
          </div>
          <Link href="/equipment-hire" className="rounded-sm bg-seam-blue px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-basalt">
            Small equipment hire
          </Link>
        </section>
      </div>
    </div>
  );
}
