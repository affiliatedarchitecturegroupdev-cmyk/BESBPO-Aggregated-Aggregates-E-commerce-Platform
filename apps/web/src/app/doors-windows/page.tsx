import type { Metadata } from "next";
import {
  SuppliesDepartmentPage,
  type SuppliesDepartmentCopy,
} from "@/components/merchandising/SuppliesDepartmentPage";

export const metadata: Metadata = {
  title: "Doors, Windows & Frames — Doors, Steel Door Frames, F7 Steel Windows",
  description:
    "Interior and exterior doors in 813 × 2032 mm, steel door frames for half- and full-brick walls, SANS 727 F7 steel windows and aluminium windows, delivered with your building materials.",
  alternates: { canonical: "/doors-windows" },
};

const COPY: SuppliesDepartmentCopy = {
  departmentSlug: "doors-windows",
  eyebrow: "Doors · frames · steel and aluminium windows",
  headline: "Openings, framed and ready to build in",
  intro:
    "Steel door frames and F7 steel windows go into the wall as it rises, so they come with your bricks and cement. Doors and aluminium follow for the finishing — standard sizes priced where we can, the rest quoted with the merchant.",
  tips: [
    {
      title: "Build frames in as you go",
      text: "Steel door frames and windows are bedded into the brickwork course by course — brace them plumb and square, and order them with the walling materials so the bricklayer isn't waiting.",
      href: "/products?category=windows-frames",
      cta: "Shop steel windows →",
    },
    {
      title: "Half-brick or full-brick?",
      text: "Frames are made for the wall: 115 mm for internal half-brick walls, 230 mm for external full-brick walls. Tell us which, and left- or right-hand, on the quote.",
      href: "/products?category=doors-frames",
      cta: "Shop door frames →",
    },
    {
      title: "Window codes, decoded",
      text: "F7 steel windows use standard codes — NE for small top-hung units, NC for casements, ND for taller ones, with F for a fanlight. Your plans list the code for each opening.",
    },
  ],
};

/** Building-supplies department landing page (BUILDING_SUPPLIES_CATALOGUE.md). */
export default function DoorsWindowsPage() {
  return <SuppliesDepartmentPage copy={COPY} />;
}
