/**
 * Besbpo Group companies we cross-sell to (Oct 2026): the materials we sell
 * are what they build and finish with, so the store points buyers who'd
 * rather have the job done to them. Every link carries UTM tags so each
 * company can see the leads aggregates.store sends.
 *
 * Service lists are kept general; confirm them against each company's own
 * site before adding anything more specific.
 */
export type GroupCompany = {
  key: "affiliated-builders" | "finishes-construction";
  name: string;
  url: string;
  tagline: string;
  pitch: string;
  services: string[];
  /** Category slugs whose buyers are most likely to need this company. */
  complements: string[];
  cta: string;
};

export const GROUP_COMPANIES: GroupCompany[] = [
  {
    key: "affiliated-builders",
    name: "Affiliated Builders",
    url: "https://affiliatedbuilders.besbpo.co.za",
    tagline: "Building, from the ground up",
    pitch: "Ordering sub-base, stone, sand and cement for a build? Affiliated Builders can take on the build itself — with the same materials, delivered on time.",
    services: ["New builds and extensions", "Foundations, slabs and structural work", "Boundary walls and retaining structures", "Driveways, paving and site works"],
    complements: [
      "sub-base-base-course",
      "crushed-stone",
      "sand-fine-aggregates",
      "crusher-run-road-building",
      "ballast-rail",
      "drainage-filter",
      "recycled-sustainable",
      "cement-hydraulic-binders",
      "mortars-grouts-admixtures",
    ],
    cta: "Get a building quote",
  },
  {
    key: "finishes-construction",
    name: "Finishes Construction",
    url: "https://finishes.besbpo.co.za",
    tagline: "The finish that makes the build",
    pitch: "Plaster and screeding sand, decorative stone and grouts are only half the job. Finishes Construction handles the finishing work, inside and out.",
    services: ["Plastering and screeding", "Tiling and flooring", "Painting and interior finishes", "Landscaping and decorative stone features"],
    complements: ["sand-fine-aggregates", "decorative-landscaping", "mortars-grouts-admixtures"],
    cta: "Get a finishing quote",
  },
];

/** A Group company link, tagged so the company can see which page sent the lead. */
export function groupLink(company: GroupCompany, placement: string) {
  const url = new URL(company.url);
  url.searchParams.set("utm_source", "aggregates.store");
  url.searchParams.set("utm_medium", "cross_sell");
  url.searchParams.set("utm_campaign", placement);
  return url.toString();
}

/** The company whose work most often follows buying this category (the builders win ties). */
export function companyForCategory(categorySlug: string): GroupCompany {
  if (["decorative-landscaping"].includes(categorySlug)) return GROUP_COMPANIES[1];
  return GROUP_COMPANIES.find((c) => c.complements.includes(categorySlug)) ?? GROUP_COMPANIES[0];
}
