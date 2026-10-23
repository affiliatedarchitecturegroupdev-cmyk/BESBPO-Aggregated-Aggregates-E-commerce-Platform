import type { Metadata } from "next";
import {
  SuppliesDepartmentPage,
  type SuppliesDepartmentCopy,
} from "@/components/merchandising/SuppliesDepartmentPage";

export const metadata: Metadata = {
  title: "Glass, Glazing & Aluminium — Safety Glass, Mirrors, Shower Enclosures, Balustrades, Shopfronts",
  description: "Float, laminated, toughened, tinted and low-E glass cut to size, mirrors, shower enclosures and screens, glass balustrades and spigots, aluminium sections and made-to-measure shopfronts, windows and doors.",
  alternates: { canonical: "/glass-aluminium" },
};

const COPY: SuppliesDepartmentCopy = {
  departmentSlug: "glass-aluminium",
  eyebrow: "Glass · showers · balustrades · aluminium",
  headline: "Cut to size, glazed to code",
  intro: "Replacement panes and mirrors, frameless showers and balustrades, and aluminium shopfronts, windows and doors made to your sizes.",
  tips: [
    {
      title: "Safety glass where it counts",
      text: "SANS 10400-N requires safety glass in doors, sidelights, low-level panes, showers and balustrades — we specify it on the quote.",
      href: "/products?category=glass-mirrors",
      cta: "Shop glass →",
    },
    {
      title: "We measure frameless glass",
      text: "Frameless showers and balustrades are measured on site before the glass is toughened — it can't be cut afterwards.",
      href: "/products?category=shower-enclosures-balustrades",
      cta: "Shop showers & balustrades →",
    },
    {
      title: "Made to measure",
      text: "Aluminium shopfronts, windows and doors are fabricated to your opening sizes and quoted per m², glazed and with hardware.",
      href: "/products?category=aluminium-sections-shopfronts",
      cta: "Shop aluminium →",
    },
  ],
  alsoSee: [{ href: "/doors-windows", label: "Doors & windows" }],
};

/** Range-expansion department landing page (docs/pricing/RANGE_EXPANSION.md). */
export default function GlassAluminiumPage() {
  return <SuppliesDepartmentPage copy={COPY} />;
}
