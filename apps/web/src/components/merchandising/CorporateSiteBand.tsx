import { CORPORATE_SITE_URL, GROUP_SITE_URL, LEGAL_ENTITY } from "@/data/social";

const corporateHost = new URL(CORPORATE_SITE_URL).host;

// The brand's strata courses, widening towards the base — echoes the logo and the hero.
const COURSES = [
  { width: "28%", color: "#C08A34" },
  { width: "44%", color: "#3E6A85" },
  { width: "60%", color: "#3E6A85" },
  { width: "76%", color: "#3E6A85" },
  { width: "92%", color: "#3E6A85" },
];

/**
 * Homepage feature for the corporate website: the store sells the materials;
 * the corporate site tells the company's story. Facts here are only ones the
 * store already states (legal entity, registration, national coverage).
 */
export function CorporateSiteBand({ partnerSuppliers }: { partnerSuppliers: number | null }) {
  return (
    <section aria-labelledby="corporate-heading" className="mx-auto max-w-6xl px-4 pb-14">
      <div className="relative overflow-hidden rounded-sm bg-basalt text-limestone">
        <div className="grid gap-8 p-6 md:grid-cols-[1.4fr_1fr] md:items-center md:p-10">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-ochre-gold">The company behind the store</p>
            <h2 id="corporate-heading" className="mt-2 font-display text-2xl font-bold leading-tight md:text-3xl">
              Meet Aggregated Aggregates
            </h2>
            <p className="mt-3 max-w-xl font-body text-sm leading-6 text-limestone/80">
              This store is where you buy. Our corporate website is where you get to know us — who we are, what we stand for, and how to work with us as a
              customer, supplier or partner.
            </p>
            <dl className="mt-6 grid max-w-xl grid-cols-3 gap-3 border-t border-limestone/15 pt-5">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wider text-limestone/50">Coverage</dt>
                <dd className="mt-1 font-display text-lg font-bold">9 provinces</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wider text-limestone/50">Partner suppliers</dt>
                <dd className="mt-1 font-display text-lg font-bold">{partnerSuppliers ?? "National"}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wider text-limestone/50">Part of</dt>
                <dd className="mt-1 font-display text-lg font-bold">Besbpo Group</dd>
              </div>
            </dl>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href={CORPORATE_SITE_URL}
                target="_blank"
                rel="noopener"
                data-corporate-link="homepage"
                className="group inline-flex items-center gap-2 rounded-sm bg-ochre-gold px-5 py-3 font-body text-sm font-semibold text-basalt transition-colors hover:bg-limestone"
              >
                Visit our corporate website
                <span aria-hidden="true" className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none">↗</span>
              </a>
              <a
                href={GROUP_SITE_URL}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 rounded-sm border border-limestone/30 px-5 py-3 font-body text-sm font-semibold text-limestone hover:border-limestone"
              >
                Besbpo Group ↗
              </a>
            </div>
            <p className="mt-4 font-mono text-[10px] text-limestone/45">
              {corporateHost} · {LEGAL_ENTITY.name} t/a {LEGAL_ENTITY.tradingAs} · Reg. {LEGAL_ENTITY.registrationNumber}
            </p>
          </div>
          <div className="hidden flex-col items-center gap-1.5 md:flex" aria-hidden="true">
            {COURSES.map((course, i) => (
              <div key={i} className="h-9 rounded-sm" style={{ width: course.width, backgroundColor: course.color, opacity: 0.55 + i * 0.1 }} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
