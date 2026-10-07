/**
 * Further business lines (recycled loop, fill exchange, testing, diesel,
 * small-equipment dry hire). All are quote-only until partner or provider
 * rates are captured in writing (AGENTIC_RULES.md rules 1 and 15), so no
 * prices are shown. Each request becomes an enquiry for sales to work.
 */
export type ExtraLine = {
  slug: string;
  path: string;
  title: string;
  /** short label for menus and cards */
  short: string;
  intro: string;
  items: { name: string; text: string }[];
  howItWorks: string[];
  notes: string[];
  serviceModel: string;
  /** extra questions on the request form (name → label) */
  fields: { name: string; label: string; placeholder?: string; type?: "text" | "number" | "select"; options?: string[]; required?: boolean }[];
};

export const EXTRA_LINES: ExtraLine[] = [
  {
    slug: "recycled",
    path: "/recycled",
    title: "Recycled Aggregate Loop",
    short: "Recycled loop",
    intro: "Rubble from your demolition or clearing job is crushed and returned to site as recycled aggregate: one loop, less haulage and landfill.",
    items: [
      { name: "Rubble take-back", text: "Concrete and brick rubble collected by partner tippers." },
      { name: "Crushed recycled concrete (RCA)", text: "Returned as fill or sub-base from our recycled range." },
      { name: "Recycled brick aggregate", text: "For drainage, bedding and fill where the specification allows." },
    ],
    howItWorks: ["Describe the rubble: type, rough volume and site access.", "We quote removal, crushing and return together.", "Partners haul it out; recycled aggregate is delivered back to site."],
    notes: ["Whether recycled material suits your job is the engineer's call.", "Quoted per job — no rates are published."],
    serviceModel: "Agent — arranged with partner crushers and hauliers",
    fields: [
      { name: "Rubble type", label: "Rubble type", placeholder: "Concrete, brick, mixed…" },
      { name: "Approx volume m3", label: "Approximate volume (m³)", type: "number" },
    ],
  },
  {
    slug: "fill-exchange",
    path: "/fill-exchange",
    title: "Fill Exchange",
    short: "Fill exchange",
    intro: "Match clean surplus fill from one site with another site that needs it, with haulage arranged through our partners.",
    items: [
      { name: "I have surplus fill", text: "Tell us about clean soil, rock or rubble: volume, location and when it's available." },
      { name: "I need fill", text: "Tell us the volume, specification and delivery site." },
      { name: "Haulage", text: "Tipper loads arranged through our partner network." },
    ],
    howItWorks: ["Tell us what you have or need.", "We look for a match within a sensible haul distance.", "Both sides confirm and we quote the haulage."],
    notes: ["Clean fill only — no contaminated or hazardous material.", "Material suitability is the engineer's call; we don't certify fill."],
    serviceModel: "Agent — matching plus partner haulage",
    fields: [
      { name: "Have or need", label: "Do you have fill or need it?", type: "select", options: ["I have surplus fill", "I need fill"], required: true },
      { name: "Material", label: "Material", placeholder: "Soil, G7 fill, rock…" },
      { name: "Approx volume m3", label: "Approximate volume (m³)", type: "number" },
    ],
  },
  {
    slug: "testing",
    path: "/testing",
    title: "Cube & Compaction Testing",
    short: "Testing",
    intro: "Request concrete cube testing and in-situ density / compaction testing from an accredited laboratory, alongside your materials and plant.",
    items: [
      { name: "Concrete cube testing", text: "7- and 28-day compressive strength tests on site-cast cubes." },
      { name: "Compaction / density testing", text: "In-situ density checks on fill and base layers." },
      { name: "Test certificates", text: "Results are reported by the laboratory and sent to you." },
    ],
    howItWorks: ["Tell us what needs testing and when.", "An accredited laboratory partner confirms the scope and price.", "Samples are collected or tested on site and the laboratory issues the results."],
    notes: ["We arrange the test; the accredited laboratory issues the certificate.", "Each laboratory's accreditation is checked before it's used."],
    serviceModel: "Agent — accredited laboratory partners",
    fields: [
      { name: "Test type", label: "Test type", placeholder: "Cube tests, density tests…" },
      { name: "Number of tests", label: "Number of cubes or test points", type: "number" },
    ],
  },
  {
    slug: "diesel",
    path: "/diesel",
    title: "Diesel Delivery to Site",
    short: "Diesel",
    intro: "Bulk diesel delivered to your plant on site through a licensed fuel supplier.",
    items: [
      { name: "Site bunkering", text: "Delivery to site tanks or directly into machines." },
      { name: "Contract supply", text: "Scheduled deliveries for long-running plant jobs." },
    ],
    howItWorks: ["Tell us the volume, site and access.", "The supplier confirms the day's price — diesel is a moving price.", "Delivered with a signed delivery note."],
    notes: ["The fuel price moves, so it's quoted on the day.", "Dispensing and transport licences are confirmed with the supplier before any delivery."],
    serviceModel: "Licensed fuel supplier",
    fields: [
      { name: "Litres", label: "Litres needed", type: "number", required: true },
      { name: "Frequency", label: "Once-off or scheduled?", placeholder: "Once-off / weekly…" },
    ],
  },
  {
    slug: "equipment-hire",
    path: "/equipment-hire",
    title: "Small Equipment & Scaffolding Hire",
    short: "Small equipment",
    intro: "Dry hire of plate compactors, breakers, generators, mixers and scaffolding, with a refundable deposit.",
    items: [
      { name: "Compaction & breaking", text: "Plate compactors, rammers and breakers." },
      { name: "Power & mixing", text: "Generators and concrete mixers." },
      { name: "Scaffolding", text: "Frames and tubes delivered and collected." },
    ],
    howItWorks: ["Tell us the kit, dates and whether you'll collect or need delivery.", "A partner confirms availability, deposit and rate.", "You accept the written quote; the deposit is refunded when the kit comes back in order."],
    notes: ["Dry hire: no operator or fuel included, unlike plant hire.", "Deposit and damage terms are set in the hire agreement."],
    serviceModel: "Agent — dry hire with deposit",
    fields: [
      { name: "Equipment", label: "Equipment needed", placeholder: "Plate compactor, 5kVA generator…" },
      { name: "Hire days", label: "Number of days", type: "number" },
    ],
  },
];

export function findExtraLine(slug: string) {
  return EXTRA_LINES.find((l) => l.slug === slug);
}
