import type { Metadata } from "next";
import {
  SuppliesDepartmentPage,
  type SuppliesDepartmentCopy,
} from "@/components/merchandising/SuppliesDepartmentPage";

export const metadata: Metadata = {
  title: "HVAC & Ventilation — Inverter Air Conditioners, Cassette & Ducted Units, Extractor Fans, Ducting",
  description: "Inverter wall-split air conditioners from 9,000 to 36,000 BTU, cassette and ducted units, copper pair coil and installation accessories, extractor and inline fans, ducting, grilles, cowls and industrial fans.",
  alternates: { canonical: "/hvac-ventilation" },
};

const COPY: SuppliesDepartmentCopy = {
  departmentSlug: "hvac-ventilation",
  eyebrow: "Air conditioning · ventilation · extraction",
  headline: "Cool the rooms, clear the air",
  intro: "Air conditioning sized to the room, and ventilation and extraction for bathrooms, kitchens, workshops and parking — supplied, or supplied and installed.",
  tips: [
    {
      title: "Size to the heat load",
      text: "As a rough guide 9,000 BTU cools about 15 m² and 12,000 BTU about 20 m² — sun, ceiling height and occupancy change it, so we size each unit on the quote.",
      href: "/products?category=air-conditioning",
      cta: "Shop air conditioning →",
    },
    {
      title: "Registered installers",
      text: "Air conditioners are installed by a SAQCC Gas-registered technician and wired by a registered electrician.",
    },
    {
      title: "Ventilate to code",
      text: "SANS 10400-O requires mechanical ventilation where rooms have no opening windows — bathrooms, kitchens and basements.",
      href: "/products?category=ventilation-extraction",
      cta: "Shop ventilation →",
    },
  ],
  alsoSee: [{ href: "/electrical", label: "Electrical & solar" }],
};

/** Range-expansion department landing page (docs/pricing/RANGE_EXPANSION.md). */
export default function HvacVentilationPage() {
  return <SuppliesDepartmentPage copy={COPY} />;
}
