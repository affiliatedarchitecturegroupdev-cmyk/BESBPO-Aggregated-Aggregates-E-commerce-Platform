import type { Metadata } from "next";
import {
  SuppliesDepartmentPage,
  type SuppliesDepartmentCopy,
} from "@/components/merchandising/SuppliesDepartmentPage";

export const metadata: Metadata = {
  title: "Boards & Sheet Materials — Shutterply, Plywood, OSB, Chipboard, MDF, Masonite",
  description: "Film-faced shutterply and shutterboard, pine and marine plywood, OSB, chipboard, melamine, SupaWood (MDF), Masonite and fibre-cement boards — by the sheet.",
  alternates: { canonical: "/boards-formwork" },
};

const COPY: SuppliesDepartmentCopy = {
  departmentSlug: "boards-formwork",
  eyebrow: "Shuttering · plywood · OSB · MDF",
  headline: "Shutter the slab, then build the cupboards",
  intro: "Shuttering ply for the concrete work and the boards for cupboards, cladding and site hoarding. Props, formwork and scaffolding now have their own department.",
  tips: [
    {
      title: "Oil the shutters",
      text: "Clean and oil shutterply with release agent after every pour — film-faced ply gives many more re-uses than raw pine shutterboard.",
      href: "/products?category=formwork-accessories",
      cta: "Shop release agent →",
    },
    {
      title: "Prop to the engineer's layout",
      text: "Prop spacing and striking times come from the engineer — never strike props early or remove them from under fresh concrete.",
      href: "/formwork-access",
      cta: "Shop formwork & props →",
    },
    {
      title: "Scaffolding is regulated",
      text: "The Construction Regulations (2014) require scaffolding to be erected, inspected and used under a competent person, on firm, level bearing.",
      href: "/formwork-access",
      cta: "Shop scaffolding & access →",
    },
  ],
};

/** Services & fit-out department landing page (docs/pricing/FITOUT_CATALOGUE.md). */
export default function BoardsFormworkPage() {
  return <SuppliesDepartmentPage copy={COPY} />;
}
