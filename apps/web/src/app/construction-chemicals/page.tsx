import type { Metadata } from "next";
import {
  SuppliesDepartmentPage,
  type SuppliesDepartmentCopy,
} from "@/components/merchandising/SuppliesDepartmentPage";

export const metadata: Metadata = {
  title: "Construction Chemicals — Curing, Repair Mortars, Floor Hardeners, Sealants, Waterstops, Anchors",
  description: "Curing compounds, bonding agents, structural repair mortars, self-levelling screeds, floor hardeners and sealers, joint fillers and sealants, waterstops, chemical anchors, epoxy grouts and tanking systems.",
  alternates: { canonical: "/construction-chemicals" },
};

const COPY: SuppliesDepartmentCopy = {
  departmentSlug: "construction-chemicals",
  eyebrow: "Repair · floors · joints · anchoring",
  headline: "The chemistry that makes concrete last",
  intro: "Cure it, repair it, seal the joints, anchor into it and keep the water out — the specialist products the concrete and waterproofing contractors specify.",
  tips: [
    {
      title: "Follow the data sheet",
      text: "Coverage, mixing, application temperatures and curing times are on each product's data sheet — we confirm quantities for your area on the quote.",
    },
    {
      title: "Joints are sized for movement",
      text: "Seal joints on a backer rod, about half as deep as they are wide, with a sealant rated for the movement and exposure.",
      href: "/products?category=joints-waterstops",
      cta: "Shop joints & waterstops →",
    },
    {
      title: "Anchors depend on installation",
      text: "A chemical anchor's load depends on the hole size, cleaning and cure time — follow the maker's installation steps exactly.",
      href: "/products?category=anchors-epoxy-grout",
      cta: "Shop anchors & grouts →",
    },
  ],
  alsoSee: [{ href: "/paint-waterproofing", label: "Waterproofing & sealants" }, { href: "/products?category=mortars-grouts-admixtures", label: "Mortars, grouts & admixtures" }],
};

/** Range-expansion department landing page (docs/pricing/RANGE_EXPANSION.md). */
export default function ConstructionChemicalsPage() {
  return <SuppliesDepartmentPage copy={COPY} />;
}
