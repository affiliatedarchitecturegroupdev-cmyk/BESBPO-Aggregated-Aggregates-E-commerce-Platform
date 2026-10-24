import type { Metadata } from "next";
import {
  SuppliesDepartmentPage,
  type SuppliesDepartmentCopy,
} from "@/components/merchandising/SuppliesDepartmentPage";

export const metadata: Metadata = {
  title: "Roads, Civil & Traffic — Asphalt, Bitumen, Road Marking, Cones, Barriers, Survey",
  description: "Cold-mix and hot-mix asphalt, bitumen emulsions, prime and tack coats, crack sealants, road-marking paint, thermoplastic and road studs, cones, barriers and temporary signs, survey equipment and erosion control.",
  alternates: { canonical: "/roads-civil" },
};

const COPY: SuppliesDepartmentCopy = {
  departmentSlug: "roads-civil",
  eyebrow: "Asphalt · marking · traffic · survey",
  headline: "From the pothole to the parking lot",
  intro: "Road repair and surfacing materials, road marking, traffic management for road works and the setting-out kit for the survey crew — for contractors, municipalities, estates and businesses.",
  tips: [
    {
      title: "Patch it properly",
      text: "Cut the pothole square, clean it, tack-coat the edges, then fill in layers and compact each one — cold-mix asphalt is ready to use from the bag.",
      href: "/products?category=asphalt-bitumen",
      cta: "Shop asphalt & bitumen →",
    },
    {
      title: "Road works follow the manual",
      text: "Temporary traffic control on public roads follows the SADC Road Traffic Signs Manual and the road authority's approved plan.",
      href: "/products?category=traffic-safety",
      cta: "Shop cones & signs →",
    },
    {
      title: "Aggregates for the layers",
      text: "G1–G7 base and sub-base, crusher run and road stone come from the aggregates department, by the ton or m³.",
      href: "/products?category=sub-base-base-course",
      cta: "Shop base course →",
    },
  ],
  alsoSee: [{ href: "/products?category=crusher-run-road-building", label: "Crusher run" }, { href: "/precast-concrete", label: "Barriers & bollards" }],
};

/** Range-expansion department landing page (docs/pricing/RANGE_EXPANSION.md). */
export default function RoadsCivilPage() {
  return <SuppliesDepartmentPage copy={COPY} />;
}
