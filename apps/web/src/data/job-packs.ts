import { PRODUCTS } from "./catalogue";
import { plantBySku, serviceBySku } from "./plant-services";
import { READY_MIX_PRODUCTS } from "./ready-mix";

/**
 * Job packs: materials, plant and services for a common job in one request.
 * Each line points at a real SKU in our catalogues. Hire and services are
 * quoted until partner rates exist, so a pack is sent to sales as one
 * enquiry and comes back as one written quote (PLANT_HIRE_CATALOGUE.md).
 */
export type EstimatorTemplate = "driveway" | "slab" | "drainage" | "platform" | "demolition-fill";

export type JobPackLine = { sku: string; label: string; note?: string };

export type JobPack = {
  slug: string;
  name: string;
  summary: string;
  lines: JobPackLine[];
  /** the estimator template that sizes this pack */
  estimatorTemplate: EstimatorTemplate;
};

export const JOB_PACKS: JobPack[] = [
  {
    slug: "foundation-and-slab",
    name: "Foundation & Slab",
    summary: "Clear, dig, bed and pour — one request for a house slab or small commercial floor.",
    estimatorTemplate: "slab",
    lines: [
      { sku: "AA-SVC-CLEAR", label: "Site clearing", note: "Quoted from photos and area" },
      { sku: "AA-PLT-TLB-4X4", label: "TLB 4x4 (wet hire)" },
      { sku: "AA-CRR-01", label: "Crusher run hardcore" },
      { sku: "AA-SND-08", label: "Sand blinding" },
      { sku: "AA-RMX-25MPA-001", label: "25 MPa ready-mix" },
      { sku: "PUMP", label: "Concrete pump (optional)", note: "Quoted separately" },
    ],
  },
  {
    slug: "driveway-and-hardstand",
    name: "Driveway & Hardstand",
    summary: "Excavate, haul, build up the base layers and compact.",
    estimatorTemplate: "driveway",
    lines: [
      { sku: "AA-PLT-EXC-5T", label: "Excavator 5t (wet hire)" },
      { sku: "AA-SVC-HAUL-10M3", label: "Tipper haulage — 10m³ loads" },
      { sku: "AA-SBC-05", label: "G5 base layer" },
      { sku: "AA-CRR-01", label: "Crusher run wearing layer" },
      { sku: "AA-PLT-ROL-8-12T", label: "Smooth-drum roller (wet hire)" },
    ],
  },
  {
    slug: "drainage-and-soakaway",
    name: "Drainage & Soakaway",
    summary: "Trench, bed, fill with filter stone and finish.",
    estimatorTemplate: "drainage",
    lines: [
      { sku: "AA-PLT-EXC-3T", label: "Mini excavator 3t (wet hire)" },
      { sku: "AA-DRN-05", label: "Filter stone" },
      { sku: "AA-SND-08", label: "Pipe bedding sand" },
      { sku: "AA-SVC-RUBBLE-6M3", label: "Spoil removal — 6m³ loads" },
    ],
  },
  {
    slug: "platform-and-site-prep",
    name: "Platform & Site Prep",
    summary: "Clear, strip, remove rubble, import fill and compact a building platform.",
    estimatorTemplate: "platform",
    lines: [
      { sku: "AA-SVC-CLEAR", label: "Site clearing", note: "Quoted" },
      { sku: "AA-PLT-EXC-14T", label: "Excavator 14t (wet hire)" },
      { sku: "AA-SVC-RUBBLE-10M3", label: "Rubble removal — 10m³ loads" },
      { sku: "AA-REC-01", label: "Recycled crushed concrete fill" },
      { sku: "AA-PLT-ROL-PAD", label: "Padfoot roller (wet hire)" },
    ],
  },
  {
    slug: "demolition-to-fill",
    name: "Demolition to Fill",
    summary: "Quoted demolition, rubble hauled away, recycled aggregate back to site.",
    estimatorTemplate: "demolition-fill",
    lines: [
      { sku: "AA-SVC-DEMOLITION", label: "Demolition", note: "Always quoted" },
      { sku: "AA-SVC-HAUL-10M3", label: "Rubble haulage — 10m³ loads" },
      { sku: "AA-REC-01", label: "Recycled crushed concrete back to site" },
    ],
  },
];

export type ResolvedLine = JobPackLine & { kind: "Material" | "Concrete" | "Plant hire" | "Service" | "Pump"; href: string | null };

/** Where a pack line lives on the site, and what kind of line it is. */
export function resolveLine(line: JobPackLine): ResolvedLine {
  const product = PRODUCTS.find((p) => p.sku === line.sku);
  if (product) return { ...line, kind: "Material", href: `/products/${product.slug}` };
  const mix = READY_MIX_PRODUCTS.find((p) => p.sku === line.sku);
  if (mix) return { ...line, kind: "Concrete", href: `/products/${mix.slug}` };
  const plant = plantBySku(line.sku);
  if (plant) return { ...line, kind: "Plant hire", href: `/plant-hire/${plant.slug}` };
  const service = serviceBySku(line.sku);
  if (service) return { ...line, kind: "Service", href: `/services/${service.slug}` };
  return { ...line, kind: "Pump", href: "/products?category=ready-mix-concrete" };
}

export function findJobPack(slug: string) {
  return JOB_PACKS.find((p) => p.slug === slug);
}
