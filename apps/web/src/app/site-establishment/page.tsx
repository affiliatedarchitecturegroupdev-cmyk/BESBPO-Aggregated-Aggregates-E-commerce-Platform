import type { Metadata } from "next";
import {
  SuppliesDepartmentPage,
  type SuppliesDepartmentCopy,
} from "@/components/merchandising/SuppliesDepartmentPage";

export const metadata: Metadata = {
  title: "Site Establishment & Temporary Works — Site Offices, Containers, Toilets, Hoarding, Site Power",
  description: "Site offices and storage containers, guard huts, ablutions and chemical toilets, temporary fencing, hoarding and site signs, site distribution boxes, lighting towers and extension reels, and site consumables.",
  alternates: { canonical: "/site-establishment" },
};

const COPY: SuppliesDepartmentCopy = {
  departmentSlug: "site-establishment",
  eyebrow: "Offices · welfare · hoarding · power",
  headline: "Set up the site on day one",
  intro: "Everything a contractor needs before the first trench: accommodation and storage, welfare, a secure boundary, signage, temporary power and lighting, and the consumables that keep the site clean.",
  tips: [
    {
      title: "Sale or hire",
      text: "Containers, site offices, toilets, temporary fencing and lighting towers are sold or hired through our partners — we quote rates, delivery and collection.",
      href: "/products?category=site-accommodation",
      cta: "Shop site accommodation →",
    },
    {
      title: "The site board and signs",
      text: "The Construction Regulations (2014) require site notices and safety signage — we print the project board to your details.",
      href: "/products?category=temporary-fencing-hoarding",
      cta: "Shop hoarding & signs →",
    },
    {
      title: "Temporary power is wired properly",
      text: "Site distribution boxes are installed by a registered electrician with earth leakage on every circuit.",
      href: "/products?category=site-power-lighting",
      cta: "Shop site power →",
    },
  ],
  alsoSee: [{ href: "/plant-hire", label: "Plant hire" }, { href: "/services", label: "Site services" }],
};

/** Range-expansion department landing page (docs/pricing/RANGE_EXPANSION.md). */
export default function SiteEstablishmentPage() {
  return <SuppliesDepartmentPage copy={COPY} />;
}
