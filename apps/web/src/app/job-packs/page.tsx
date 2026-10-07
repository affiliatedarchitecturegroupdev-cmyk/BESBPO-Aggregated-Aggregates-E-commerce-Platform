import type { Metadata } from "next";
import Link from "next/link";
import { EnquiryForm } from "@/components/enquiries/EnquiryForm";
import { JOB_PACKS, resolveLine } from "@/data/job-packs";

export const metadata: Metadata = {
  title: "Job Packs — Materials, Plant & Services in One Request",
  description:
    "Foundation & slab, driveway, drainage, site platform and demolition-to-fill packs: aggregates, ready-mix, plant hire and haulage in one request and one written quote.",
  alternates: { canonical: "/job-packs" },
};

const KIND_STYLE: Record<string, string> = {
  Material: "bg-seam-blue/10 text-seam-blue",
  Concrete: "bg-seam-blue/10 text-seam-blue",
  "Plant hire": "bg-ochre-gold/15 text-basalt",
  Service: "bg-ochre-gold/15 text-basalt",
  Pump: "bg-ochre-gold/15 text-basalt",
};

export default function JobPacksPage({ searchParams }: { searchParams: { pack?: string } }) {
  const chosen = JOB_PACKS.find((p) => p.slug === searchParams.pack) ?? null;
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / Job Packs
      </nav>
      <p className="mt-6 font-mono text-xs uppercase tracking-widest text-seam-blue">Materials + machines + trucks</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-basalt md:text-4xl">Job Packs</h1>
      <p className="mt-3 max-w-2xl font-body text-sm text-slate">
        Everything a common job needs, in one request: the aggregates and concrete, the machines and the trucks. Materials keep their live prices on
        their product pages; plant and services are quoted until partner rates are in place, so each pack comes back as one written quote.
      </p>
      <p className="mt-3 font-body text-sm">
        <Link href="/estimator" className="font-semibold text-seam-blue hover:underline">Not sure of the quantities? Size the job with the estimator →</Link>
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {JOB_PACKS.map((pack) => (
          <article key={pack.slug} id={pack.slug} className="flex scroll-mt-24 flex-col rounded-sm border border-basalt/10 bg-white p-5">
            <h2 className="font-display text-xl font-bold text-basalt">{pack.name}</h2>
            <p className="mt-1 font-body text-sm text-slate">{pack.summary}</p>
            <ul className="mt-4 flex-1 divide-y divide-basalt/10 font-body text-sm">
              {pack.lines.map(resolveLine).map((l) => (
                <li key={`${pack.slug}-${l.sku}`} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    {l.href ? (
                      <Link href={l.href} className="text-basalt hover:text-seam-blue hover:underline">{l.label}</Link>
                    ) : (
                      <span className="text-basalt">{l.label}</span>
                    )}
                    {l.note && <span className="block font-body text-xs text-slate">{l.note}</span>}
                  </span>
                  <span className={`shrink-0 rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase ${KIND_STYLE[l.kind]}`}>{l.kind}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href={`/job-packs?pack=${pack.slug}#request`} className="rounded-sm bg-seam-blue px-4 py-2 font-body text-sm font-semibold text-limestone hover:bg-basalt">
                Request this pack
              </Link>
              <Link href={`/estimator?job=${pack.estimatorTemplate}`} className="rounded-sm border border-basalt/20 px-4 py-2 font-body text-sm text-basalt hover:border-seam-blue">
                Size it
              </Link>
            </div>
          </article>
        ))}
      </div>

      <section id="request" className="mt-14 scroll-mt-24 rounded-sm border border-basalt/10 bg-white p-5 md:p-8">
        <h2 className="font-display text-2xl font-bold text-basalt">Request a job pack</h2>
        <p className="mt-1 font-body text-sm text-slate">Tell us the job and its size. We&apos;ll price the materials, match the plant and send one written quote.</p>
        <div className="mt-6">
          <EnquiryForm
            key={chosen?.slug ?? "none"}
            kind="JOB_PACK"
            subject={chosen ? `Job pack: ${chosen.name}` : "Job pack"}
            fields={[
              { name: "Pack", label: "Which pack?", type: "select", options: JOB_PACKS.map((p) => p.name), required: true, defaultValue: chosen?.name },
              { name: "Size", label: "Size of the job", placeholder: "e.g. 10m × 4m driveway, 150mm base" },
              { name: "Start date", label: "When do you want to start?", type: "date" },
            ]}
            submitLabel="Request this pack"
          />
        </div>
      </section>
    </div>
  );
}
