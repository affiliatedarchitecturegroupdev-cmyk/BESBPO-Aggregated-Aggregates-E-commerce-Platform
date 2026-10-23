import type { Metadata } from "next";
import {
  SuppliesDepartmentPage,
  type SuppliesDepartmentCopy,
} from "@/components/merchandising/SuppliesDepartmentPage";

export const metadata: Metadata = {
  title: "Prefab Buildings & Structures — Wendy Houses, Steel Sheds, Carports, Light Steel Frame, Modular Buildings",
  description: "Wendy houses in log-lap, shiplap and nutec, steel sheds, carports, garages and workshops, light steel frame studs, tracks and building kits, modular classrooms, offices, clinics and container conversions.",
  alternates: { canonical: "/prefab-structures" },
};

const COPY: SuppliesDepartmentCopy = {
  departmentSlug: "prefab-structures",
  eyebrow: "Wendy houses · steel · LSF · modular",
  headline: "Buildings that arrive ready to go up",
  intro: "Garden rooms and storage, steel carports and workshops, light steel frame building systems and modular buildings for schools, clinics, mines and sites.",
  tips: [
    {
      title: "Prepare the base",
      text: "Prefab buildings go on a level slab or plinths — the quote confirms the base, delivery access and erection.",
      href: "/products?category=wendy-houses-sheds",
      cta: "Shop Wendy houses & sheds →",
    },
    {
      title: "LSF is engineered",
      text: "Light steel frame buildings are designed to SANS 517 and erected by an accredited contractor; LSF homes are enrolled with the NHBRC.",
      href: "/products?category=light-steel-frame",
      cta: "Shop light steel frame →",
    },
    {
      title: "Plans where needed",
      text: "Buildings beyond the National Building Regulations' exemptions need municipal approval — we can connect you with our design partners.",
      href: "/design",
      cta: "See design services →",
    },
  ],
  alsoSee: [{ href: "/site-establishment", label: "Site offices & containers" }],
};

/** Range-expansion department landing page (docs/pricing/RANGE_EXPANSION.md). */
export default function PrefabStructuresPage() {
  return <SuppliesDepartmentPage copy={COPY} />;
}
