import type { Metadata } from "next";
import {
  SuppliesDepartmentPage,
  type SuppliesDepartmentCopy,
} from "@/components/merchandising/SuppliesDepartmentPage";

export const metadata: Metadata = {
  title:
    "Water Storage & Plumbing — Water Tanks, Geysers, Polycop and Soil Pipe",
  description:
    "Water tanks from 2,400 to 5,000 litres, 150 L geysers, Polycop and copper water pipe, and 110 mm soil and vent pipe — with the base, sand and stone to go with them.",
  alternates: { canonical: "/water-plumbing" },
};

const COPY: SuppliesDepartmentCopy = {
  departmentSlug: "water-plumbing",
  eyebrow: "Tanks · geysers · water pipe · soil pipe",
  headline: "Store it, heat it, pipe it",
  intro:
    "A water tank needs a level, solid base — a concrete slab or compacted stone — so it comes with the cement and aggregate. Supply pipe and soil pipe are here too; the underground sewer pipe and fittings are in Drainage.",
  tips: [
    {
      title: "A proper base for the tank",
      text: "A full 5,000 L tank weighs over five tonnes. Stand it on a level concrete slab or compacted G5 at least as wide as the tank — never on bricks or loose soil.",
      href: "/products?category=sub-base-base-course",
      cta: "Shop sub-base →",
    },
    {
      title: "Registered plumbers only",
      text: "Geysers and connections to the municipal supply must be installed by a registered plumber, who issues the certificate of compliance (SANS 10254 and 10252).",
      href: "/products?category=water-tanks-geysers",
      cta: "Shop tanks and geysers →",
    },
    {
      title: "Underground drainage",
      text: "uPVC sewer pipe, bends, junctions and rodding eyes for the drains under the house are in the Drainage department.",
      href: "/drainage",
      cta: "Go to Drainage →",
    },
  ],
};

/** Building-supplies department landing page (BUILDING_SUPPLIES_CATALOGUE.md). */
export default function WaterPlumbingPage() {
  return <SuppliesDepartmentPage copy={COPY} />;
}
