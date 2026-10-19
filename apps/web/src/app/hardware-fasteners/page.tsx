import type { Metadata } from "next";
import {
  SuppliesDepartmentPage,
  type SuppliesDepartmentCopy,
} from "@/components/merchandising/SuppliesDepartmentPage";

export const metadata: Metadata = {
  title: "Hardware & Fasteners — Nails, Screws, Anchors, Bolts, Locks, Hinges",
  description: "Wire and masonry nails, screws, wall plugs, sleeve and wedge anchors, bolts and threaded rod, and locksets, hinges, handles, padlocks and door hardware.",
  alternates: { canonical: "/hardware-fasteners" },
};

const COPY: SuppliesDepartmentCopy = {
  departmentSlug: "hardware-fasteners",
  eyebrow: "Fixings · locks · hinges",
  headline: "Every fixing, and the hardware to hang the doors",
  intro: "Nails, screws and anchors for every material, and the locks, hinges and handles that go on the doors — in site quantities.",
  tips: [
    {
      title: "Match the fixing to the wall",
      text: "Wall plugs suit brick and block; sleeve and wedge anchors are for concrete and heavy loads; frame fixings fix door and window frames in one step.",
      href: "/products?category=fasteners-fixings",
      cta: "Shop fixings →",
    },
    {
      title: "Exterior doors need more levers",
      text: "Use at least a 3-lever lock on outside doors; a 4-lever or cylinder lock gives better security — check what your insurer asks for.",
      href: "/products?category=locks-ironmongery",
      cta: "Shop locks →",
    },
    {
      title: "Three hinges on heavy doors",
      text: "Solid and exterior doors hang on three hinges, not two, so they don't drop.",
    },
  ],
  alsoSee: [{ href: "/products?category=roof-flashings-fixings", label: "Roofing screws and hook bolts" }, { href: "/products?category=timber-connectors", label: "Timber connectors, nails and bolts" }],
};

/** Services & fit-out department landing page (docs/pricing/FITOUT_CATALOGUE.md). */
export default function HardwareFastenersPage() {
  return <SuppliesDepartmentPage copy={COPY} />;
}
