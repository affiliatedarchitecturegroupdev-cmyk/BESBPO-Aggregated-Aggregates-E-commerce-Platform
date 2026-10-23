import type { Metadata } from "next";
import {
  SuppliesDepartmentPage,
  type SuppliesDepartmentCopy,
} from "@/components/merchandising/SuppliesDepartmentPage";

export const metadata: Metadata = {
  title: "Garden, Lawn & Landscaping — Instant Lawn, Topsoil, Compost, Fertiliser, Irrigation, Artificial Grass",
  description: "Kikuyu, LM, buffalo and Cynodon instant lawn, lawn seed, topsoil, compost and mulch bagged or bulk, fertilisers, irrigation, sprinklers and hoses, planters, edging, artificial grass and garden tools and machines.",
  alternates: { canonical: "/garden-landscaping" },
};

const COPY: SuppliesDepartmentCopy = {
  departmentSlug: "garden-landscaping",
  eyebrow: "Lawn · soil · irrigation · tools",
  headline: "Lawn, beds and irrigation — delivered",
  intro: "Instant lawn fresh from the grower, bulk soils by the tipper load, the irrigation to keep it green and the tools to maintain it — for homes, estates, complexes and landscapers.",
  tips: [
    {
      title: "Prepare before the lawn arrives",
      text: "Instant lawn is perishable: level and water the soil before delivery, lay it the same day and water daily for two weeks.",
      href: "/products?category=instant-lawn-seed",
      cta: "Shop instant lawn →",
    },
    {
      title: "Bulk soil by the tipper",
      text: "Topsoil, compost and lawn dressing come loose by the m³ on a tipper — keep the drop-off point clear.",
      href: "/products?category=soils-compost-mulch",
      cta: "Shop soils & compost →",
    },
    {
      title: "Stone and pavers too",
      text: "Decorative stone, pebbles, stepping stones and retaining blocks are in Aggregates and Paving.",
      href: "/products?category=decorative-landscaping",
      cta: "Shop decorative stone →",
    },
  ],
  alsoSee: [{ href: "/paving", label: "Paving & retaining" }, { href: "/outdoor-living", label: "Outdoor living" }],
};

/** Range-expansion department landing page (docs/pricing/RANGE_EXPANSION.md). */
export default function GardenLandscapingPage() {
  return <SuppliesDepartmentPage copy={COPY} />;
}
