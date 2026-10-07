import type { Metadata } from "next";
import Link from "next/link";
import { HireHowItWorks } from "@/components/plant/HowItWorks";
import { ServiceCard } from "@/components/plant/PlantCard";
import { SERVICES } from "@/data/plant-services";
import { EXTRA_LINES } from "@/data/extra-lines";

export const metadata: Metadata = {
  title: "Site Services — Haulage, Rubble Removal, Skips & Demolition",
  description:
    "Tipper haulage, rubble removal, skip bins, site clearing, demolition and scheduled waste management across South Africa, done by vetted partners. Request a written quote.",
  alternates: { canonical: "/services" },
};

/** CAT-14 site services. Quote-only until partner rate cards are in (PLANT_HIRE_CATALOGUE.md). */
export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / Site Services
      </nav>
      <p className="mt-6 font-mono text-xs uppercase tracking-widest text-seam-blue">Haulage · rubble · skips · clearing</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-basalt md:text-4xl">Site Services</h1>
      <p className="mt-3 max-w-2xl font-body text-sm text-slate">
        Move material, clear a site or get rid of rubble — handled by vetted partners, with rubble and waste taken to licensed sites. Every service is
        quoted until our partners&apos; written rates are in place.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((s) => (
          <ServiceCard key={s.sku} item={s} />
        ))}
      </div>

      <h2 className="mt-14 font-display text-2xl font-bold text-basalt">How it works</h2>
      <div className="mt-5">
        <HireHowItWorks />
      </div>

      <h2 className="mt-14 font-display text-2xl font-bold text-basalt">More from the platform</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {EXTRA_LINES.map((l) => (
          <Link key={l.slug} href={l.path} className="rounded-sm border border-basalt/10 bg-white p-4 transition-colors hover:border-seam-blue">
            <h3 className="font-display text-sm font-semibold text-basalt">{l.title}</h3>
            <p className="mt-1 line-clamp-3 font-body text-xs text-slate">{l.intro}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
