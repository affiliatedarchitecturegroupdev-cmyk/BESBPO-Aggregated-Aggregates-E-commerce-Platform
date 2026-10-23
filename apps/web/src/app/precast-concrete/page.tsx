import type { Metadata } from "next";
import {
  SuppliesDepartmentPage,
  type SuppliesDepartmentCopy,
} from "@/components/merchandising/SuppliesDepartmentPage";

export const metadata: Metadata = {
  title: "Precast Concrete — Hollow-Core & Rib-and-Block Slabs, Barriers, Bollards, Panel Walls, Septic Tanks",
  description: "Prestressed hollow-core and rib-and-block suspended floors, precast stairs, beams and balconies, New Jersey barriers, bollards, cable draw boxes, precast panel walls and septic and conservancy tanks.",
  alternates: { canonical: "/precast-concrete" },
};

const COPY: SuppliesDepartmentCopy = {
  departmentSlug: "precast-concrete",
  eyebrow: "Slabs · barriers · walls · tanks",
  headline: "Made in the yard, placed by crane",
  intro: "Precast floors that go up without shuttering, barriers and bollards for roads and parking, precast boundary walls and on-site sanitation — designed to order and delivered by crane truck.",
  tips: [
    {
      title: "Designed for your span",
      text: "Hollow-core and rib-and-block floors are designed from your floor plan and span — send the drawings and we'll quote per m² with the props and mesh.",
      href: "/products?category=structural-precast",
      cta: "Shop suspended floors →",
    },
    {
      title: "Crane access matters",
      text: "Precast is delivered and placed by crane truck — confirm access, overhead lines and where the truck can stand when you order.",
    },
    {
      title: "Sanitation needs approval",
      text: "Septic and conservancy tanks need municipal approval under SANS 10400-P; we size the tank to the household or building.",
      href: "/products?category=precast-walls-tanks",
      cta: "Shop tanks & walls →",
    },
  ],
  alsoSee: [{ href: "/drainage", label: "Precast drainage" }, { href: "/paving", label: "Kerbs & paving" }],
};

/** Range-expansion department landing page (docs/pricing/RANGE_EXPANSION.md). */
export default function PrecastConcretePage() {
  return <SuppliesDepartmentPage copy={COPY} />;
}
