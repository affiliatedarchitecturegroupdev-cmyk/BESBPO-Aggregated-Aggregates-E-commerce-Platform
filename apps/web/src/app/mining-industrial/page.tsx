import type { Metadata } from "next";
import {
  SuppliesDepartmentPage,
  type SuppliesDepartmentCopy,
} from "@/components/merchandising/SuppliesDepartmentPage";

export const metadata: Metadata = {
  title: "Mining & Industrial — Steel Grating, Shotcrete, Roof Bolts, Ventilation Duct, Industrial Floors & Linings",
  description: "Galvanised floor grating and stair treads, expanded metal, shotcrete mixes and fibres, roof-bolting mesh, rock bolts and resin, ventilation duct, mining PPE, industrial floors, chemical-resistant and wear linings and warehouse safety.",
  alternates: { canonical: "/mining-industrial" },
};

const COPY: SuppliesDepartmentCopy = {
  departmentSlug: "mining-industrial",
  eyebrow: "Grating · underground · floors · linings",
  headline: "Supplied to the mine's specification",
  intro: "Access and walkways for plants, underground support and ventilation consumables, and the floors and linings that stand up to traffic, chemicals and wear — quoted to your specification or tender.",
  tips: [
    {
      title: "Send the specification",
      text: "Mining and industrial products are supplied to the buyer's specification — send the drawing, spec or tender reference with the quote.",
    },
    {
      title: "Grating cut to the drawing",
      text: "Floor grating is cut and banded to the panel layout on your drawing, then galvanised.",
      href: "/products?category=steel-grating-treads",
      cta: "Shop grating →",
    },
    {
      title: "Mining timber and ballast",
      text: "Mining props and pack timber are in Timber, and rail ballast in Aggregates.",
      href: "/products?category=industrial-mining-timber",
      cta: "Shop mining timber →",
    },
  ],
  alsoSee: [{ href: "/reinforcing-steel", label: "Structural steel" }, { href: "/products?category=ballast-rail", label: "Ballast" }],
};

/** Range-expansion department landing page (docs/pricing/RANGE_EXPANSION.md). */
export default function MiningIndustrialPage() {
  return <SuppliesDepartmentPage copy={COPY} />;
}
