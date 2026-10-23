import type { Metadata } from "next";
import {
  SuppliesDepartmentPage,
  type SuppliesDepartmentCopy,
} from "@/components/merchandising/SuppliesDepartmentPage";

export const metadata: Metadata = {
  title: "Kitchens & Built-ins — Kitchen Units, Worktops, Hobs, Ovens, Extractors, Built-In Cupboards",
  description: "Kitchen base, drawer, sink, wall and tall units from 300 to 1,200 mm, post-formed, granite and quartz worktops, built-in hobs, ovens and extractors, bedroom built-in cupboards and cabinet hardware.",
  alternates: { canonical: "/kitchens-built-ins" },
};

const COPY: SuppliesDepartmentCopy = {
  departmentSlug: "kitchens-built-ins",
  eyebrow: "Kitchens · worktops · appliances · cupboards",
  headline: "Kitchens and cupboards, unit by unit",
  intro: "Build a kitchen from standard units, pick the worktop and the appliances, and fit the bedrooms with built-in cupboards — for homes, rentals and developments.",
  tips: [
    {
      title: "Plan from the layout",
      text: "Send a sketch with wall lengths, windows and the plumbing and electrical points — we'll quote the units, worktops and fillers.",
      href: "/products?category=kitchen-cabinets",
      cta: "Shop kitchen units →",
    },
    {
      title: "Template stone tops",
      text: "Granite and quartz worktops are templated on site after the units are fixed, then cut and installed.",
      href: "/products?category=worktops-appliances",
      cta: "Shop worktops →",
    },
    {
      title: "Sinks and taps",
      text: "Sinks, taps, traps and wastes are in Bathroom & Kitchen.",
      href: "/bathroom-kitchen",
      cta: "Shop sinks & taps →",
    },
  ],
  alsoSee: [{ href: "/bathroom-kitchen", label: "Bathroom & kitchen" }],
};

/** Range-expansion department landing page (docs/pricing/RANGE_EXPANSION.md). */
export default function KitchensBuiltInsPage() {
  return <SuppliesDepartmentPage copy={COPY} />;
}
