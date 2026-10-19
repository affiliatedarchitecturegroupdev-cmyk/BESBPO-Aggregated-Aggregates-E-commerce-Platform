import type { Metadata } from "next";
import {
  SuppliesDepartmentPage,
  type SuppliesDepartmentCopy,
} from "@/components/merchandising/SuppliesDepartmentPage";

export const metadata: Metadata = {
  title: "Tiles & Flooring — Ceramic & Porcelain Tiles, Laminate, Vinyl, Skirting, Trims",
  description: "Ceramic and porcelain floor and wall tiles, outdoor non-slip tiles, laminate and SPC vinyl flooring, skirting, tile trims, spacers and levelling systems.",
  alternates: { canonical: "/tiles-flooring" },
};

const COPY: SuppliesDepartmentCopy = {
  departmentSlug: "tiles-flooring",
  eyebrow: "Tiles · laminate · vinyl · trims",
  headline: "Floors and walls that finish the room",
  intro: "Ceramic and porcelain tiles by the box, laminate and vinyl planks, and the trims and skirting that finish the edges — with tile adhesive and grout from the cement department.",
  tips: [
    {
      title: "Order 10% extra, one batch",
      text: "Buy every box for one room from the same batch — shade and calibre are printed on the box — and about 10% extra for cuts and breakage.",
    },
    {
      title: "Adhesive matters",
      text: "Porcelain and large-format tiles need a porcelain or flexible adhesive, not standard ceramic adhesive; outdoor and over-screed-heating floors need flexible.",
      href: "/products?category=mortars-grouts-admixtures",
      cta: "Shop adhesives & grout →",
    },
    {
      title: "Flat floors for large tiles",
      text: "Tiles over 600 mm show every bump — level the screed first and use a levelling system to stop lipping.",
      href: "/products?category=tiling-accessories",
      cta: "Shop levelling systems →",
    },
  ],
  alsoSee: [{ href: "/products?category=mortars-grouts-admixtures", label: "Tile adhesives, grouts and screeds" }, { href: "/products?category=site-tools", label: "Tile cutters and site tools" }],
};

/** Services & fit-out department landing page (docs/pricing/FITOUT_CATALOGUE.md). */
export default function TilesFlooringPage() {
  return <SuppliesDepartmentPage copy={COPY} />;
}
