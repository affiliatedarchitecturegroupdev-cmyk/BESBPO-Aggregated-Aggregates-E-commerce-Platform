import type { Metadata } from "next";
import {
  SuppliesDepartmentPage,
  type SuppliesDepartmentCopy,
} from "@/components/merchandising/SuppliesDepartmentPage";

export const metadata: Metadata = {
  title:
    "Waterproofing, Sealants & Paint — Sealants, Torch-On, Laykold, Acrylic and Roof Paint",
  description:
    "Silicone and acrylic sealants, expanding foam, bitumen and torch-on waterproofing, reinforcing membrane, and interior, exterior and roof paint, plaster primer and enamel.",
  alternates: { canonical: "/paint-waterproofing" },
};

const COPY: SuppliesDepartmentCopy = {
  departmentSlug: "paint-waterproofing",
  eyebrow: "Sealants · waterproofing · paint",
  headline: "Seal it, waterproof it, finish it",
  intro:
    "The last trade on most jobs and the first to get blamed for a leak. Sealants for every joint, bitumen and torch-on systems for flat roofs and foundations, and paint from primer to topcoat.",
  tips: [
    {
      title: "Silicone or acrylic?",
      text: "Silicone for wet areas and glass — flexible and waterproof, but not paintable. Acrylic for gaps you'll paint over, around frames and skirtings.",
      href: "/products?category=waterproofing-sealants",
      cta: "Shop sealants →",
    },
    {
      title: "Flat roofs need a system",
      text: "A bitumen-rubber emulsion with reinforcing membrane, or a torch-on membrane laid by an experienced applicator — with falls to the outlets. Paint alone won't keep a flat roof dry.",
    },
    {
      title: "Primer first",
      text: "New plaster and RhinoLite skims need a plaster primer before the topcoat; new galvanised roofs need weathering or an etch primer.",
      href: "/products?category=paint-coatings",
      cta: "Shop paint →",
    },
  ],
};

/** Building-supplies department landing page (BUILDING_SUPPLIES_CATALOGUE.md). */
export default function PaintWaterproofingPage() {
  return <SuppliesDepartmentPage copy={COPY} />;
}
