import { GROUP_COMPANIES, groupLink, type GroupCompany } from "@/data/group-companies";
import type { Promotion } from "@/lib/promotions";
import { PromoSlot } from "./PromoSlot";

const ACCENT: Record<GroupCompany["key"], string> = {
  "affiliated-builders": "from-basalt to-seam-blue",
  "finishes-construction": "from-basalt to-[#6b4f2a]",
};

/**
 * "Need it built or finished?" — the homepage section selling Besbpo Group's
 * building and finishing companies. Staff can run their own banner in the
 * Group cross-sell slot (Admin → Promotions); it shows above the two cards.
 */
export function GroupCrossSell({ promotion }: { promotion?: Promotion }) {
  return (
    <section aria-labelledby="group-heading" className="mx-auto max-w-6xl px-4 py-14">
      <p className="font-mono text-xs uppercase tracking-widest text-seam-blue">From the Besbpo Group</p>
      <h2 id="group-heading" className="mt-1 font-display text-2xl font-bold text-basalt">Need it built or finished?</h2>
      <p className="mt-2 max-w-2xl font-body text-sm text-slate">
        Our sister companies use the same materials we sell. Buy the materials here, or have the whole job done — building by Affiliated Builders, finishing by
        Finishes Construction.
      </p>
      {promotion && (
        <div className="mt-6">
          <PromoSlot promotion={promotion} />
        </div>
      )}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {GROUP_COMPANIES.map((company) => (
          <GroupCompanyCard key={company.key} company={company} placement="homepage_section" />
        ))}
      </div>
    </section>
  );
}

export function GroupCompanyCard({ company, placement }: { company: GroupCompany; placement: string }) {
  return (
    <a
      href={groupLink(company, placement)}
      target="_blank"
      rel="noopener"
      data-group-company={company.key}
      className={`group flex flex-col justify-between rounded-sm bg-gradient-to-br ${ACCENT[company.key]} p-6 text-limestone shadow-sm transition-transform hover:-translate-y-0.5 motion-reduce:transition-none`}
    >
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-ochre-gold">{company.tagline}</p>
        <h3 className="mt-2 font-display text-xl font-bold">{company.name}</h3>
        <p className="mt-2 font-body text-sm text-limestone/85">{company.pitch}</p>
        <ul className="mt-4 grid gap-1.5 font-body text-xs text-limestone/85 sm:grid-cols-2">
          {company.services.map((s) => (
            <li key={s} className="flex gap-2">
              <span aria-hidden="true" className="text-ochre-gold">■</span>
              {s}
            </li>
          ))}
        </ul>
      </div>
      <span className="mt-6 inline-flex w-fit items-center gap-2 rounded-sm bg-ochre-gold px-4 py-2 font-body text-sm font-semibold text-basalt group-hover:bg-limestone">
        {company.cta} <span aria-hidden="true">↗</span>
      </span>
      <span className="sr-only">(opens {new URL(company.url).host} in a new tab)</span>
    </a>
  );
}
