import Link from "next/link";
import { PlantCard, ServiceCard } from "@/components/plant/PlantCard";
import { HireHowItWorks } from "@/components/plant/HowItWorks";
import { JOB_PACKS } from "@/data/job-packs";
import { plantBySku, serviceBySku } from "@/data/plant-services";

const FEATURED_PLANT = ["AA-PLT-TLB-4X4", "AA-PLT-EXC-5T", "AA-PLT-TIP-10M3", "AA-PLT-ROL-8-12T"];
const FEATURED_SERVICES = ["AA-SVC-HAUL-10M3", "AA-SVC-RUBBLE-6M3", "AA-SVC-SKIP-6M3", "AA-SVC-DEMOLITION"];

/** Home: plant hire and site services, with the enquiry-led flow. */
export function PlantAndServicesSection() {
  const plant = FEATURED_PLANT.map(plantBySku).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const services = FEATURED_SERVICES.map(serviceBySku).filter((s): s is NonNullable<typeof s> => Boolean(s));
  return (
    <section className="border-t border-basalt/10 bg-limestone px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-seam-blue">New · Plant & site services</span>
            <h2 className="mt-2 font-display text-3xl font-bold text-basalt">Machines and trucks for the same site</h2>
            <p className="mt-2 max-w-2xl font-body text-sm text-slate">Wet hire with operator and fuel, haulage, rubble removal and skips — from vetted partners near you, quoted in writing.</p>
          </div>
          <Link href="/plant-hire" className="hidden shrink-0 font-body text-sm font-semibold text-seam-blue hover:underline md:block">
            All machines →
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plant.map((p) => (
            <PlantCard key={p.sku} item={p} />
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s) => (
            <ServiceCard key={s.sku} item={s} />
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-4 font-body text-sm font-semibold md:hidden">
          <Link href="/plant-hire" className="text-seam-blue hover:underline">All machines →</Link>
          <Link href="/services" className="text-seam-blue hover:underline">All services →</Link>
        </div>
        <div className="mt-10">
          <HireHowItWorks />
        </div>
      </div>
    </section>
  );
}

/** Home: job packs and the estimator. */
export function JobPacksSection() {
  return (
    <section className="bg-white px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-seam-blue">One request, one quote</span>
            <h2 className="mt-2 font-display text-3xl font-bold text-basalt">Job Packs</h2>
          </div>
          <Link href="/estimator" className="shrink-0 font-body text-sm font-semibold text-seam-blue hover:underline">
            Size your job →
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {JOB_PACKS.map((p) => (
            <Link key={p.slug} href={`/job-packs#${p.slug}`} className="rounded-sm border border-basalt/10 p-5 transition-colors hover:border-seam-blue">
              <h3 className="font-display text-base font-semibold text-basalt">{p.name}</h3>
              <p className="mt-2 font-body text-xs text-slate">{p.summary}</p>
              <p className="mt-3 font-mono text-[10px] uppercase text-slate">{p.lines.length} lines</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Home: recruit plant and haulage partners. */
export function PartnerCta() {
  return (
    <section className="px-4 py-16">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-sm bg-basalt p-8 text-limestone md:flex-row md:items-center md:p-10">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-ochre-gold">Partner network</span>
          <h2 className="mt-2 font-display text-2xl font-bold md:text-3xl">Own plant, tippers or skips?</h2>
          <p className="mt-2 max-w-xl font-body text-sm text-limestone/80">Join our vetted partner network and receive work from contractors near you.</p>
        </div>
        <Link href="/partners" className="shrink-0 rounded-sm bg-ochre-gold px-6 py-3 font-body text-sm font-semibold text-basalt hover:bg-limestone">
          Become a partner →
        </Link>
      </div>
    </section>
  );
}
