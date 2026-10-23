import type { Metadata } from "next";
import {
  SuppliesDepartmentPage,
  type SuppliesDepartmentCopy,
} from "@/components/merchandising/SuppliesDepartmentPage";

export const metadata: Metadata = {
  title: "Outdoor Living — Braais, Fireplaces, Shade Sails, Carports, Polycarbonate, Pools & Pool Care",
  description: "Built-in, freestanding and gas braais, braai grids, closed-combustion fireplaces and flues, firebricks, shade sails and carports, twin-wall polycarbonate, pool pumps, filters, marbelite, chemicals and outdoor lighting.",
  alternates: { canonical: "/outdoor-living" },
};

const COPY: SuppliesDepartmentCopy = {
  departmentSlug: "outdoor-living",
  eyebrow: "Braais · shade · pools · lighting",
  headline: "Everything for the stoep, the braai and the pool",
  intro: "Build the braai, shade the patio and the car, look after the pool and light the garden — for homes, lodges and hospitality.",
  tips: [
    {
      title: "Firebricks for the fire",
      text: "Line braais and fireplaces with firebricks laid in fireclay — ordinary bricks and mortar crack in the heat.",
      href: "/products?category=braais-fireplaces",
      cta: "Shop braais & fireplaces →",
    },
    {
      title: "Pool chemicals apart",
      text: "Store chlorine and acid apart, add chemicals to water (never water to chemicals) and keep them away from children.",
      href: "/products?category=pools-water-features",
      cta: "Shop pool care →",
    },
    {
      title: "Shade structures may need plans",
      text: "Carports and shade structures over 20 m² need to comply with the National Building Regulations — your municipality may require plans.",
      href: "/products?category=shade-patio-cover",
      cta: "Shop shade & cover →",
    },
  ],
  alsoSee: [{ href: "/garden-landscaping", label: "Garden & landscaping" }, { href: "/timber", label: "Pergola & lapa kits" }],
};

/** Range-expansion department landing page (docs/pricing/RANGE_EXPANSION.md). */
export default function OutdoorLivingPage() {
  return <SuppliesDepartmentPage copy={COPY} />;
}
