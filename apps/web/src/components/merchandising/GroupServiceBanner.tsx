import { companyForCategory, groupLink } from "@/data/group-companies";

/**
 * A slim banner under a product (and in the cart) pointing to the Group
 * company whose work follows buying this material: Affiliated Builders for
 * structural materials, Finishes Construction for finishing ones.
 */
export function GroupServiceBanner({ categorySlug, placement }: { categorySlug: string; placement: string }) {
  const company = companyForCategory(categorySlug);
  return (
    <aside className="flex flex-wrap items-center justify-between gap-4 rounded-sm border border-seam-blue/20 bg-seam-blue/5 p-5" data-group-company={company.key}>
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-widest text-seam-blue">Besbpo Group · {company.name}</p>
        <p className="mt-1 font-body text-sm font-semibold text-basalt">
          {company.key === "affiliated-builders" ? "Rather have it built for you?" : "Want it finished for you?"}
        </p>
        <p className="mt-0.5 max-w-xl font-body text-xs text-slate">{company.pitch}</p>
      </div>
      <a
        href={groupLink(company, placement)}
        target="_blank"
        rel="noopener"
        className="shrink-0 rounded-sm bg-seam-blue px-4 py-2 font-body text-sm font-semibold text-limestone hover:bg-basalt"
      >
        {company.cta} ↗
      </a>
    </aside>
  );
}
