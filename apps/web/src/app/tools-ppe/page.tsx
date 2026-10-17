import type { Metadata } from "next";
import {
  SuppliesDepartmentPage,
  type SuppliesDepartmentCopy,
} from "@/components/merchandising/SuppliesDepartmentPage";

export const metadata: Metadata = {
  title:
    "Site Tools, PPE & Consumables — Bolsters, Levels, Wheelbarrows, Hard Hats, Boots",
  description:
    "Bricklaying and site tools — bolsters, spirit levels, builder's line, trowels, wheelbarrows, shovels and spades — and PPE: hard hats, reflective vests, safety boots, gloves, glasses, dust masks and barrier tape.",
  alternates: { canonical: "/tools-ppe" },
};

const COPY: SuppliesDepartmentCopy = {
  departmentSlug: "tools-ppe",
  eyebrow: "Tools · PPE · site safety",
  headline: "Kit out the site and the team",
  intro:
    "The tools every bricklayer and general worker needs, and the PPE the Construction Regulations require — delivered with the materials so nobody waits for a trip to the hardware store.",
  tips: [
    {
      title: "PPE is the law on site",
      text: "The Construction Regulations (2014) require hard hats, safety boots and, for the task, gloves, eye and hearing protection. Replace a hard hat after any impact.",
      href: "/products?category=ppe-site-safety",
      cta: "Shop PPE →",
    },
    {
      title: "Silica dust",
      text: "Cutting and grinding brick, block and concrete gives off silica dust — use FFP2 masks or better, wet cutting, and keep others clear. FFP1 is for nuisance dust only.",
    },
    {
      title: "Cordon off the dig",
      text: "Barrier tape marks a hazard but doesn't stop a fall — open trenches need proper barriers or covers at the end of the day.",
      href: "/products?category=ppe-site-safety",
      cta: "Shop barrier tape →",
    },
  ],
};

/** Building-supplies department landing page (BUILDING_SUPPLIES_CATALOGUE.md). */
export default function ToolsPpePage() {
  return <SuppliesDepartmentPage copy={COPY} />;
}
