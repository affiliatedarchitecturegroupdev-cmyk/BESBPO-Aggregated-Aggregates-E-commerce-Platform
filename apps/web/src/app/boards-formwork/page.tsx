import type { Metadata } from "next";
import {
  SuppliesDepartmentPage,
  type SuppliesDepartmentCopy,
} from "@/components/merchandising/SuppliesDepartmentPage";

export const metadata: Metadata = {
  title: "Boards & Formwork — Shutterply, Plywood, OSB, MDF, Props, Scaffolding",
  description: "Film-faced shutterply and shutterboard, plywood, OSB, chipboard, melamine, SupaWood and Masonite, and steel props, formwork ties, column clamps and scaffolding.",
  alternates: { canonical: "/boards-formwork" },
};

const COPY: SuppliesDepartmentCopy = {
  departmentSlug: "boards-formwork",
  eyebrow: "Shuttering · boards · props · scaffolding",
  headline: "Shutter the slab, then build the cupboards",
  intro: "Shuttering ply and props for the concrete work, scaffolding for working at height, and the boards for cupboards, cladding and site hoarding.",
  tips: [
    {
      title: "Oil the shutters",
      text: "Clean and oil shutterply with release agent after every pour — film-faced ply gives many more re-uses than raw pine shutterboard.",
      href: "/products?category=mortars-grouts-admixtures",
      cta: "Shop release agent →",
    },
    {
      title: "Prop to the engineer's layout",
      text: "Prop spacing and striking times come from the engineer — never strike props early or remove them from under fresh concrete.",
      href: "/products?category=formwork-scaffolding",
      cta: "Shop props →",
    },
    {
      title: "Scaffolding is regulated",
      text: "The Construction Regulations (2014) require scaffolding to be erected, inspected and used under a competent person, on firm, level bearing.",
    },
  ],
};

/** Services & fit-out department landing page (docs/pricing/FITOUT_CATALOGUE.md). */
export default function BoardsFormworkPage() {
  return <SuppliesDepartmentPage copy={COPY} />;
}
