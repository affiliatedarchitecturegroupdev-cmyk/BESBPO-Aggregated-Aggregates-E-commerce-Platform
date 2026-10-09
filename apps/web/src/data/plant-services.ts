import catalogue from "./plant-services-catalogue.json";

/**
 * Plant hire (CAT-13, wet hire) and site services (CAT-14) — the Agent model
 * in PLANT_HIRE_CATALOGUE.md. Mirrors services/pricing/data/plant_services_catalogue.json.
 *
 * Every line is quoted until at least two partners' written rate cards exist
 * for a SKU in a province (`rates` stays empty until the rate-card loader
 * fills it). The storefront never shows a hire or service price it can't
 * trace to a partner's written rate (AGENTIC_RULES.md rule 1).
 */
export type PlantClass = "TLB" | "EXCAVATOR" | "TIPPER" | "ROLLER" | "SKID_STEER" | "WHEEL_LOADER" | "SITE_DUMPER" | "WATER_TRUCK";
export type ServiceType = "HAULAGE" | "RUBBLE_REMOVAL" | "SKIP_BIN" | "SITE_CLEARING" | "DEMOLITION" | "WASTE_MANAGEMENT" | "STEEL_FIXING";
export type ServiceUnit = "PER_LOAD" | "PER_DAY" | "PER_SKIP" | "PER_M2" | "PER_TONNE" | "QUOTE";

export type PlantItem = {
  sku: string;
  slug: string;
  name: string;
  plantClass: PlantClass;
  sizeLabel: string;
  needsLowbed: boolean;
  typicalUses: string[];
  hireNotes: string;
};

export type ServiceItem = {
  sku: string;
  slug: string;
  name: string;
  serviceType: ServiceType;
  unit: ServiceUnit;
  description: string;
  typicalUses: string[];
};

export const COMMISSION_PERCENT: number = catalogue.commission_percent;
export const HOURS_PER_DAY_CAP: number = catalogue.hours_per_day_cap;
export const MIN_PARTNER_CARDS: number = catalogue.min_partner_cards;
export const HIRE_REGIONS: string[] = catalogue.regions;

export const PLANT: PlantItem[] = catalogue.plant.map((p) => ({
  sku: p.sku,
  slug: p.slug,
  name: p.name,
  plantClass: p.plant_class as PlantClass,
  sizeLabel: p.size_label,
  needsLowbed: p.needs_lowbed,
  typicalUses: p.typical_uses,
  hireNotes: p.hire_notes,
}));

export const SERVICES: ServiceItem[] = catalogue.services.map((s) => ({
  sku: s.sku,
  slug: s.slug,
  name: s.name,
  serviceType: s.service_type as ServiceType,
  unit: s.unit as ServiceUnit,
  description: s.description,
  typicalUses: s.typical_uses,
}));

export const PLANT_CLASS_LABEL: Record<PlantClass, string> = {
  TLB: "TLBs",
  EXCAVATOR: "Excavators",
  TIPPER: "Tipper trucks",
  ROLLER: "Rollers",
  SKID_STEER: "Skid steers",
  WHEEL_LOADER: "Wheel loaders",
  SITE_DUMPER: "Site dumpers",
  WATER_TRUCK: "Water trucks",
};

export const SERVICE_TYPE_LABEL: Record<ServiceType, string> = {
  HAULAGE: "Haulage",
  RUBBLE_REMOVAL: "Rubble removal",
  SKIP_BIN: "Skip bins",
  SITE_CLEARING: "Site clearing",
  DEMOLITION: "Demolition",
  WASTE_MANAGEMENT: "Waste management",
  STEEL_FIXING: "Steel fixing",
};

export const SERVICE_UNIT_LABEL: Record<ServiceUnit, string> = {
  PER_LOAD: "Per load",
  PER_DAY: "Per day",
  PER_SKIP: "Per skip",
  PER_M2: "Per m²",
  PER_TONNE: "Per tonne fixed",
  QUOTE: "Always quoted",
};

/** What the customer asks for on a hire request. Monthly and longer is always a negotiated quote. */
export const HIRE_BASES = [
  { value: "DAY", label: "By the day" },
  { value: "WEEK", label: "By the week" },
  { value: "MONTH", label: "Monthly / long-term" },
] as const;

export function findPlant(slug: string) {
  return PLANT.find((p) => p.slug === slug);
}

export function findService(slug: string) {
  return SERVICES.find((s) => s.slug === slug);
}

export function plantBySku(sku: string) {
  return PLANT.find((p) => p.sku === sku);
}

export function serviceBySku(sku: string) {
  return SERVICES.find((s) => s.sku === sku);
}

/** Plant grouped by class, in catalogue order. */
export function plantByClass(): { plantClass: PlantClass; label: string; items: PlantItem[] }[] {
  const groups = new Map<PlantClass, PlantItem[]>();
  for (const p of PLANT) groups.set(p.plantClass, [...(groups.get(p.plantClass) ?? []), p]);
  return [...groups].map(([plantClass, items]) => ({ plantClass, label: PLANT_CLASS_LABEL[plantClass], items }));
}

/** Provinces with published (partner-backed) rates for a SKU — empty until rate cards are loaded. */
export function ratedRegions(sku: string): string[] {
  const rates = catalogue.rates as Record<string, Record<string, { pricing_status?: string }>>;
  return Object.entries(rates[sku] ?? {})
    .filter(([, r]) => r?.pricing_status?.startsWith("Ready"))
    .map(([region]) => region);
}
