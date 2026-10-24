import type { Metadata } from "next";
import {
  SuppliesDepartmentPage,
  type SuppliesDepartmentCopy,
} from "@/components/merchandising/SuppliesDepartmentPage";

export const metadata: Metadata = {
  title: "Formwork, Scaffolding & Access — Props, Ties, Formwork Beams, Ladders, Towers",
  description: "Adjustable steel props, fork heads and shoring, H20 and aluminium formwork beams, tie rods, wing nuts, cones and column formers, scaffolding, ladders, mobile towers and trestles — for sale or hire.",
  alternates: { canonical: "/formwork-access" },
};

const COPY: SuppliesDepartmentCopy = {
  departmentSlug: "formwork-access",
  eyebrow: "Formwork · shoring · scaffolding · access",
  headline: "Shutter it, prop it and work safely at height",
  intro: "Everything the formwork crew and the scaffolders need — ties and cones, props and beams, column formers and release agent — and the ladders, towers and trestles for the trades that follow.",
  tips: [
    {
      title: "Prop to the engineer's layout",
      text: "Prop spacing and striking times come from the engineer — never strike props early or remove them from under fresh concrete.",
      href: "/products?category=props-shoring-beams",
      cta: "Shop props & shoring →",
    },
    {
      title: "Buy or hire",
      text: "Props, scaffolding, towers and trench shoring can be bought or hired — we quote both, with delivery and collection.",
      href: "/plant-hire",
      cta: "See plant hire →",
    },
    {
      title: "Working at height is regulated",
      text: "The Construction Regulations (2014) require a fall-protection plan, and scaffolding erected and inspected by a competent person. Use fibreglass ladders near electricity.",
      href: "/products?category=ladders-access",
      cta: "Shop ladders & towers →",
    },
  ],
  alsoSee: [{ href: "/boards-formwork", label: "Shutterply & boards" }, { href: "/reinforcing-steel", label: "Reinforcing steel" }],
};

/** Range-expansion department landing page (docs/pricing/RANGE_EXPANSION.md). */
export default function FormworkAccessPage() {
  return <SuppliesDepartmentPage copy={COPY} />;
}
