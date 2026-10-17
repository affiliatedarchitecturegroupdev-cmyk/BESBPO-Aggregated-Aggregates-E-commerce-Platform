import type { Metadata } from "next";
import {
  SuppliesDepartmentPage,
  type SuppliesDepartmentCopy,
} from "@/components/merchandising/SuppliesDepartmentPage";

export const metadata: Metadata = {
  title:
    "Fencing & Security — Diamond Mesh, Razor Wire, Y-Standards, Palisade, Gates",
  description:
    "Diamond mesh fencing, galvanised, barbed and razor wire, Y-standards, droppers, palisade posts and panels, and mesh and security gates — delivered nationally.",
  alternates: { canonical: "/fencing-security" },
};

const COPY: SuppliesDepartmentCopy = {
  departmentSlug: "fencing-security",
  eyebrow: "Mesh · wire · posts · palisade · gates",
  headline: "Fence the site, the yard or the farm",
  intro:
    "Everything for a wire or mesh fence — Y-standards, droppers, straining and tie wire, razor wire for the top — and palisade for a sturdier boundary. Posts are set in concrete: add cement, sand and stone from the same order.",
  tips: [
    {
      title: "A mesh fence, step by step",
      text: "Corner and gate posts concreted in first, then Y-standards every 3 m, straining wires top, middle and bottom, and the mesh tied to them. Droppers keep long runs straight.",
      href: "/products?category=fencing-wire-posts",
      cta: "Shop fencing →",
    },
    {
      title: "Posts need concrete",
      text: "Corner, gate and palisade posts are set in concrete. Order the cement, sand and stone with the fence and it all comes together.",
      href: "/cement",
      cta: "Shop cement →",
    },
    {
      title: "Razor wire safely",
      text: "Razor wire is fixed with cut-resistant gloves, sleeves and eye protection — never stretched by hand. Check your municipality's rules for wall-top security before you fit it.",
    },
  ],
};

/** Building-supplies department landing page (BUILDING_SUPPLIES_CATALOGUE.md). */
export default function FencingSecurityPage() {
  return <SuppliesDepartmentPage copy={COPY} />;
}
