import type { Metadata } from "next";
import {
  SuppliesDepartmentPage,
  type SuppliesDepartmentCopy,
} from "@/components/merchandising/SuppliesDepartmentPage";

export const metadata: Metadata = {
  title: "Power Tools & Site Equipment — Drills, Breakers, Grinders, Diamond Blades, Mixers, Compactors, Lasers",
  description: "Corded and cordless drills, SDS hammers and breakers, grinders and saws, drill bits, discs and diamond blades, concrete mixers, plate compactors, vibrators and power floats, and spirit levels and lasers.",
  alternates: { canonical: "/power-tools-equipment" },
};

const COPY: SuppliesDepartmentCopy = {
  departmentSlug: "power-tools-equipment",
  eyebrow: "Tools · accessories · equipment · levels",
  headline: "The right tool, the right blade",
  intro: "Power tools for every trade, the bits, discs and blades they run on, concrete and compaction equipment for the slab and the trench, and the levels and lasers to set it all out.",
  tips: [
    {
      title: "Match the blade to the job",
      text: "Use the right diamond blade for concrete, tile, asphalt or granite, check the bore and speed rating, and never use a damaged disc.",
      href: "/products?category=power-tool-accessories",
      cta: "Shop bits & blades →",
    },
    {
      title: "Buy or hire",
      text: "Mixers, compactors, vibrators and power floats can be bought or hired — hire through plant hire for one-off jobs.",
      href: "/plant-hire",
      cta: "See plant hire →",
    },
    {
      title: "PPE with every tool",
      text: "Eye, hearing and dust protection with grinders, breakers and saws — PPE is in Site Tools & PPE.",
      href: "/tools-ppe",
      cta: "Shop PPE →",
    },
  ],
  alsoSee: [{ href: "/tools-ppe", label: "Hand tools & PPE" }],
};

/** Range-expansion department landing page (docs/pricing/RANGE_EXPANSION.md). */
export default function PowerToolsEquipmentPage() {
  return <SuppliesDepartmentPage copy={COPY} />;
}
