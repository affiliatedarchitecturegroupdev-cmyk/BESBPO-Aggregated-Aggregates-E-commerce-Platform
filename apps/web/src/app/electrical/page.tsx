import type { Metadata } from "next";
import {
  SuppliesDepartmentPage,
  type SuppliesDepartmentCopy,
} from "@/components/merchandising/SuppliesDepartmentPage";

export const metadata: Metadata = {
  title: "Electrical & Solar — Cable, Conduit, DB Boards, Switches, Lighting, Solar",
  description: "Surfix and house wire, conduit, distribution boards, breakers and earth leakage, switches, sockets and LED lighting, and solar panels, inverters and lithium batteries.",
  alternates: { canonical: "/electrical" },
};

const COPY: SuppliesDepartmentCopy = {
  departmentSlug: "electrical",
  eyebrow: "Cable · boards · lighting · solar",
  headline: "Wire the whole build, and keep the lights on",
  intro: "Everything the electrician needs for first and second fix, ordered with the rest of the materials — and solar and backup power for load-shedding.",
  tips: [
    {
      title: "A registered electrician, and a CoC",
      text: "Electrical installation work must be done by a registered electrician, who issues a Certificate of Compliance under SANS 10142-1 — you'll need it to sell or insure the property.",
    },
    {
      title: "Cable size follows the breaker",
      text: "Typically 1.5 mm² for lighting, 2.5 mm² for plugs and the geyser, and 4 to 6 mm² for the stove — your electrician sizes each run for its breaker, load and length.",
      href: "/products?category=electrical-cable-conduit",
      cta: "Shop cable & conduit →",
    },
    {
      title: "Solar has paperwork too",
      text: "Grid-tied and hybrid systems must be registered with the municipality or Eskom. Batteries need an inverter that supports them — we confirm compatibility on the quote.",
      href: "/products?category=solar-backup-power",
      cta: "Shop solar & backup →",
    },
  ],
};

/** Services & fit-out department landing page (docs/pricing/FITOUT_CATALOGUE.md). */
export default function ElectricalPage() {
  return <SuppliesDepartmentPage copy={COPY} />;
}
