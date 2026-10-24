import type { Metadata } from "next";
import {
  SuppliesDepartmentPage,
  type SuppliesDepartmentCopy,
} from "@/components/merchandising/SuppliesDepartmentPage";

export const metadata: Metadata = {
  title: "Agricultural & Farm — Farm Gates, Field & Game Fence, Cattle Grids, Troughs, Dam Liners, Shade Net",
  description: "Galvanised farm gates, knotted field and game fence, high-tensile and barbed wire, strainer posts and droppers, cattle grids and handling equipment, troughs, dam liners, reservoirs, shade net and tunnels.",
  alternates: { canonical: "/agricultural-farm" },
};

const COPY: SuppliesDepartmentCopy = {
  departmentSlug: "agricultural-farm",
  eyebrow: "Fencing · water · crop protection",
  headline: "For the farm, the smallholding and the lodge",
  intro: "Fence the camps, water the stock, line the dam and cover the crops — farm supplies delivered with the rest of your building materials.",
  tips: [
    {
      title: "Strain from braced posts",
      text: "Fence lines are strained from braced strainer and corner posts — check your boundaries before you fence.",
      href: "/products?category=farm-fencing-gates",
      cta: "Shop farm fencing →",
    },
    {
      title: "Dam liners are welded",
      text: "HDPE dam liners are welded on site on a stone-free base; new dams may need water-use authorisation.",
      href: "/products?category=livestock-water-dams",
      cta: "Shop troughs & liners →",
    },
    {
      title: "Poles, lime and irrigation",
      text: "Treated poles and droppers are in Timber, agricultural lime in Aggregates, and irrigation in Garden.",
      href: "/timber",
      cta: "Shop poles →",
    },
  ],
  alsoSee: [{ href: "/products?category=agricultural-industrial", label: "Agricultural lime" }, { href: "/garden-landscaping", label: "Irrigation" }],
};

/** Range-expansion department landing page (docs/pricing/RANGE_EXPANSION.md). */
export default function AgriculturalFarmPage() {
  return <SuppliesDepartmentPage copy={COPY} />;
}
