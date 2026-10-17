import type { Metadata } from "next";
import {
  SuppliesDepartmentPage,
  type SuppliesDepartmentCopy,
} from "@/components/merchandising/SuppliesDepartmentPage";

export const metadata: Metadata = {
  title:
    "Ceilings, Drywall & Insulation — RhinoBoard, Cornice, RhinoLite, PVC Ceilings",
  description:
    "Gyproc RhinoBoard 6.4 mm ceiling board, cove cornice, RhinoLite skimming plaster, PVC ceiling boards and cornice adhesive — with ceiling insulation and brandering from roofing.",
  alternates: { canonical: "/ceilings-drywall" },
};

const COPY: SuppliesDepartmentCopy = {
  departmentSlug: "ceilings-drywall",
  eyebrow: "Board · cornice · skim plaster · PVC · insulation",
  headline: "Close up the ceiling",
  intro:
    "Once the roof is on: brandering, insulation, RhinoBoard, cornice and a RhinoLite skim, then primer and paint. The boards and cornice are here; insulation and 38 × 38 brandering are in Roofing.",
  tips: [
    {
      title: "How many boards?",
      text: "Divide the room's ceiling area by the board size (1.2 × 3.0 m covers 3.6 m²) and add 10% for cuts. Brandering goes at the centres in Gyproc's guide — usually 400 mm.",
      href: "/products?category=ceilings-drywall",
      cta: "Shop ceiling boards →",
    },
    {
      title: "Insulate while it's open",
      text: "135 mm glass-wool or polyester insulation goes on top of the ceiling before it's closed — SANS 10400-XA sets the thickness for your area.",
      href: "/products?category=roof-insulation-rainwater",
      cta: "Shop insulation →",
    },
    {
      title: "Skim, prime, paint",
      text: "RhinoLite skims the board joints and surface; a plaster primer seals it before the topcoat.",
      href: "/paint-waterproofing",
      cta: "Paint & primer →",
    },
  ],
  alsoSee: [
    {
      href: "/products?category=roof-insulation-rainwater",
      label: "Ceiling insulation (Roofing)",
    },
    {
      href: "/roofing#roof-timber",
      label: "Brandering and timber",
    },
  ],
};

/** Building-supplies department landing page (BUILDING_SUPPLIES_CATALOGUE.md). */
export default function CeilingsDrywallPage() {
  return <SuppliesDepartmentPage copy={COPY} />;
}
