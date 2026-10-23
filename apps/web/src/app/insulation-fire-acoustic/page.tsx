import type { Metadata } from "next";
import {
  SuppliesDepartmentPage,
  type SuppliesDepartmentCopy,
} from "@/components/merchandising/SuppliesDepartmentPage";

export const metadata: Metadata = {
  title: "Insulation, Fire & Acoustic — Insulation Boards, Lagging, Extinguishers, Hose Reels, Acoustic Ceilings",
  description: "XPS, EPS and PIR insulation boards, polyester and glass-wool per m², pipe lagging and geyser blankets, fire extinguishers, hose reels, fire signs, smoke and heat detectors, fire stopping, and acoustic ceilings and insulation.",
  alternates: { canonical: "/insulation-fire-acoustic" },
};

const COPY: SuppliesDepartmentCopy = {
  departmentSlug: "insulation-fire-acoustic",
  eyebrow: "Thermal · fire · acoustic",
  headline: "Warmer, safer and quieter buildings",
  intro: "Insulation for SANS 10400-XA energy efficiency, fire equipment and fire stopping for occupancy, and acoustic ceilings and insulation for offices, schools and flats.",
  tips: [
    {
      title: "Insulate to the climate zone",
      text: "SANS 10400-XA sets the R-value for roofs and walls by climate zone — we confirm the thickness on the quote.",
      href: "/products?category=thermal-insulation",
      cta: "Shop insulation →",
    },
    {
      title: "Fire equipment is serviced",
      text: "Extinguishers and hose reels follow SANS 1910 and SANS 543 and must be serviced by an SAQCC-registered company.",
      href: "/products?category=fire-protection",
      cta: "Shop fire protection →",
    },
    {
      title: "Seal every gap",
      text: "Sound gets through gaps and back-boxes — seal joints with acoustic sealant and use resilient channels on party walls.",
      href: "/products?category=acoustic-insulation",
      cta: "Shop acoustic →",
    },
  ],
  alsoSee: [{ href: "/ceilings-drywall", label: "Ceilings & drywall" }, { href: "/products?category=roof-insulation-rainwater", label: "Roof insulation" }],
};

/** Range-expansion department landing page (docs/pricing/RANGE_EXPANSION.md). */
export default function InsulationFireAcousticPage() {
  return <SuppliesDepartmentPage copy={COPY} />;
}
