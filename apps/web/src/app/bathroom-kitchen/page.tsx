import type { Metadata } from "next";
import {
  SuppliesDepartmentPage,
  type SuppliesDepartmentCopy,
} from "@/components/merchandising/SuppliesDepartmentPage";

export const metadata: Metadata = {
  title: "Bathroom & Kitchen — Toilets, Basins, Baths, Showers, Taps, Sinks",
  description: "Toilet suites, basins, vanities, baths, shower trays and doors, taps and mixers, valves and connectors, kitchen sinks, traps and wastes.",
  alternates: { canonical: "/bathroom-kitchen" },
};

const COPY: SuppliesDepartmentCopy = {
  departmentSlug: "bathroom-kitchen",
  eyebrow: "Sanitaryware · taps · sinks",
  headline: "Bathrooms and kitchens, fitted out",
  intro: "Sanitaryware, taps and mixers, sinks and the traps, wastes and valves that connect them — for new builds, renovations and site ablutions.",
  tips: [
    {
      title: "Check it before it's fitted",
      text: "Unpack and inspect sanitaryware on delivery — chips and cracks must be reported before installation.",
    },
    {
      title: "Mind the water pressure",
      text: "High mains pressure wears out taps and cisterns; a pressure-reducing valve on the main protects the whole installation.",
      href: "/products?category=taps-mixers-valves",
      cta: "Shop valves →",
    },
    {
      title: "Outlet before you order",
      text: "Toilets come with floor (S-trap) or wall (P-trap) outlets — check where your soil pipe comes out before you choose.",
      href: "/products?category=sanitaryware",
      cta: "Shop toilets →",
    },
  ],
  alsoSee: [{ href: "/products?category=water-supply-soil-pipe", label: "Water supply, waste and soil pipe" }, { href: "/products?category=water-tanks-geysers", label: "Geysers and water tanks" }],
};

/** Services & fit-out department landing page (docs/pricing/FITOUT_CATALOGUE.md). */
export default function BathroomKitchenPage() {
  return <SuppliesDepartmentPage copy={COPY} />;
}
