import type { Metadata } from "next";
import {
  SuppliesDepartmentPage,
  type SuppliesDepartmentCopy,
} from "@/components/merchandising/SuppliesDepartmentPage";

export const metadata: Metadata = {
  title: "Timber, Poles & Decking — SA Pine, Treated Poles, Glulam, Hardwoods, Decking",
  description: "S5 and S7 SA pine, CCA and creosote treated poles, droppers and laths, glulam, I-joists and LVL, meranti and saligna PAR, decking and cladding, mining timber and carport, pergola and lapa kits.",
  alternates: { canonical: "/timber" },
};

const COPY: SuppliesDepartmentCopy = {
  departmentSlug: "timber",
  eyebrow: "Structural · poles · engineered · decking",
  headline: "From roof timber to the lapa and the deck",
  intro: "Structural SA pine for the roof, treated poles for fences and carports, engineered beams for long spans, and hardwoods and decking for the finishes — from the same timber merchants.",
  tips: [
    {
      title: "Treated means branded",
      text: "Treated timber and poles carry the treater's brand and hazard class — H2 for roof timber under cover, H3 for exterior above ground and H4 for poles in the ground.",
      href: "/products?category=treated-poles-droppers",
      cta: "Shop treated poles →",
    },
    {
      title: "Long spans need an engineer",
      text: "Glulam, LVL and I-joists are sized from the span and load — send the drawing and we'll quote the sections the engineer specifies.",
      href: "/products?category=engineered-timber",
      cta: "Shop engineered timber →",
    },
    {
      title: "Roof timber is still here",
      text: "S5 and S7 SA pine in every section, H2 or H3, with hangers, clips and connectors — and the timber variant picker on every product page.",
      href: "/products?category=structural-timber",
      cta: "Shop roof timber →",
    },
  ],
  alsoSee: [{ href: "/roofing", label: "Roofing" }, { href: "/boards-formwork", label: "Boards & sheet materials" }],
};

/** Range-expansion department landing page (docs/pricing/RANGE_EXPANSION.md). */
export default function TimberPage() {
  return <SuppliesDepartmentPage copy={COPY} />;
}
