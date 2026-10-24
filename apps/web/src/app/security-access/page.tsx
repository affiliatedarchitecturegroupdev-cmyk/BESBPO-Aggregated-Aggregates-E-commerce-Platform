import type { Metadata } from "next";
import {
  SuppliesDepartmentPage,
  type SuppliesDepartmentCopy,
} from "@/components/merchandising/SuppliesDepartmentPage";

export const metadata: Metadata = {
  title: "Security, CCTV & Access Control — Cameras, Recorders, Intercoms, Alarms, Electric Fencing",
  description: "IP and analogue CCTV cameras, NVRs, DVRs and hard drives, PoE switches, intercoms and video door stations, keypads, readers and maglocks, alarm panels, detectors and sirens, and electric-fence energisers and parts.",
  alternates: { canonical: "/security-access" },
};

const COPY: SuppliesDepartmentCopy = {
  departmentSlug: "security-access",
  eyebrow: "CCTV · access · alarms · electric fencing",
  headline: "See it, control it, and sound the alarm",
  intro: "Cameras and recorders, gate and door access control, alarm systems and electric fencing for homes, estates, businesses, sites and farms.",
  tips: [
    {
      title: "Use a registered installer",
      text: "Security systems are installed by a PSIRA-registered installer; electric fences need an Electric Fence System Certificate (SANS 10222-3).",
    },
    {
      title: "Plan the storage",
      text: "Recording days depend on the number of cameras, resolution and hard-drive size — we size the recorder and drives on the quote.",
      href: "/products?category=cctv-access-alarms",
      cta: "Shop CCTV & alarms →",
    },
    {
      title: "Fencing and gates",
      text: "Palisade, clear-view and razor fencing, gates and gate motors are in Fencing & Security.",
      href: "/fencing-security",
      cta: "Shop fencing →",
    },
  ],
  alsoSee: [{ href: "/fencing-security", label: "Fencing & gates" }],
};

/** Range-expansion department landing page (docs/pricing/RANGE_EXPANSION.md). */
export default function SecurityAccessPage() {
  return <SuppliesDepartmentPage copy={COPY} />;
}
