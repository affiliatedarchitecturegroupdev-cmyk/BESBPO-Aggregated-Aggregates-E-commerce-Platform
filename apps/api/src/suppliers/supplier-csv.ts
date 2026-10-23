import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { SupplierTier } from "@aggregates/database";

/**
 * The supplier database CSV: parsing for import, and the same columns for
 * export, so staff can export, add coordinates in a spreadsheet, and
 * re-import. supplier_id is the stable key; re-importing updates in place.
 *
 * Two source layouts are accepted: the verified partner network
 * (tier, category_codes, core_categories) and the B2B Bulk & Infrastructure
 * research list (category, sku_category_codes, products_notes, source_url).
 * A row with a source_url and no "verified" column is a researched lead,
 * not a qualified partner.
 */

/** CAT-01..CAT-09 map onto the nine core categories; CAT-10/11 onto the B2B packaged-goods ones; CAT-12 is ready-mix; CAT-15..18 are steel; CAT-19..25 masonry, paving, retaining, drainage and membranes; CAT-26..28 roofing; CAT-29 concrete roof tiles; CAT-30/31 timber; CAT-32..42 building supplies. */
export const CATEGORY_CODES: Record<string, string> = {
  "CAT-01": "sub-base-base-course",
  "CAT-02": "crushed-stone",
  "CAT-03": "sand-fine-aggregates",
  "CAT-04": "crusher-run-road-building",
  "CAT-05": "ballast-rail",
  "CAT-06": "drainage-filter",
  "CAT-07": "decorative-landscaping",
  "CAT-08": "agricultural-industrial",
  "CAT-09": "recycled-sustainable",
  "CAT-10": "cement-hydraulic-binders",
  "CAT-11": "mortars-grouts-admixtures",
  "CAT-12": "ready-mix-concrete",
  // Steel (STEEL_CATALOGUE.md)
  "CAT-15": "reinforcing-bar",
  "CAT-16": "mesh-brickforce",
  "CAT-17": "steel-fixing-accessories",
  "CAT-18": "structural-steel",
  // Masonry (MASONRY_CATALOGUE.md)
  "CAT-19": "bricks-blocks",
  "CAT-20": "lintels-dpc-wall-accessories",
  "CAT-21": "paving-kerbs-edging",
  "CAT-22": "retaining-erosion-control",
  "CAT-23": "pipes-fittings",
  "CAT-24": "precast-drainage",
  "CAT-25": "geosynthetics-membranes",
  // Roofing (ROOFING_CATALOGUE.md)
  "CAT-26": "roof-sheeting",
  "CAT-27": "roof-flashings-fixings",
  "CAT-28": "roof-insulation-rainwater",
  "CAT-29": "concrete-roof-tiles",
  "CAT-30": "structural-timber",
  "CAT-31": "timber-connectors",
  // Building supplies (BUILDING_SUPPLIES_CATALOGUE.md)
  "CAT-32": "doors-frames",
  "CAT-33": "windows-frames",
  "CAT-34": "fencing-wire-posts",
  "CAT-35": "gates-security",
  "CAT-36": "water-tanks-geysers",
  "CAT-37": "water-supply-soil-pipe",
  "CAT-38": "ceilings-drywall",
  "CAT-39": "site-tools",
  "CAT-40": "ppe-site-safety",
  "CAT-41": "waterproofing-sealants",
  "CAT-42": "paint-coatings",
  // Services & fit-out (docs/pricing/FITOUT_CATALOGUE.md)
  "CAT-43": "electrical-cable-conduit",
  "CAT-44": "electrical-distribution",
  "CAT-45": "switches-sockets-lighting",
  "CAT-46": "solar-backup-power",
  "CAT-47": "floor-wall-tiles",
  "CAT-48": "flooring-skirting",
  "CAT-49": "tiling-accessories",
  "CAT-50": "sanitaryware",
  "CAT-51": "taps-mixers-valves",
  "CAT-52": "kitchen-sinks-waste",
  "CAT-53": "fasteners-fixings",
  "CAT-54": "locks-ironmongery",
  "CAT-55": "boards-sheets",
  "CAT-56": "formwork-scaffolding",
  // CAT-57 onwards — the range expansion (docs/pricing/RANGE_EXPANSION.md).
  "CAT-57": "treated-poles-droppers",
  "CAT-58": "engineered-timber",
  "CAT-59": "hardwoods-par-timber",
  "CAT-60": "decking-cladding",
  "CAT-61": "industrial-mining-timber",
  "CAT-62": "timber-structure-kits",
  "CAT-63": "instant-lawn-seed",
  "CAT-64": "soils-compost-mulch",
  "CAT-65": "fertiliser-lawn-care",
  "CAT-66": "irrigation-hoses",
  "CAT-67": "garden-structures-edging",
  "CAT-68": "garden-tools-power",
  "CAT-69": "braais-fireplaces",
  "CAT-70": "shade-patio-cover",
  "CAT-71": "pools-water-features",
  "CAT-72": "outdoor-finishes-lighting",
  "CAT-73": "formwork-accessories",
  "CAT-74": "props-shoring-beams",
  "CAT-75": "ladders-access",
  "CAT-76": "asphalt-bitumen",
  "CAT-77": "road-marking",
  "CAT-78": "traffic-safety",
  "CAT-79": "survey-setting-out",
  "CAT-80": "erosion-sandbags",
  "CAT-81": "structural-precast",
  "CAT-82": "road-precast-barriers",
  "CAT-83": "precast-walls-tanks",
  "CAT-84": "concrete-repair-care",
  "CAT-85": "joints-waterstops",
  "CAT-86": "anchors-epoxy-grout",
  "CAT-87": "waterproofing-systems",
  "CAT-88": "thermal-insulation",
  "CAT-89": "fire-protection",
  "CAT-90": "acoustic-insulation",
  "CAT-91": "pumps-water-treatment",
  "CAT-92": "valves-meters-hdpe",
  "CAT-93": "heat-pumps-hot-water",
  "CAT-94": "commercial-lighting",
  "CAT-95": "generators-ups-power",
  "CAT-96": "glass-mirrors",
  "CAT-97": "shower-enclosures-balustrades",
  "CAT-98": "aluminium-sections-shopfronts",
  "CAT-99": "kitchen-cabinets",
  "CAT-100": "worktops-appliances",
  "CAT-101": "built-in-cupboards-hardware",
  "CAT-102": "air-conditioning",
  "CAT-103": "ventilation-extraction",
  "CAT-104": "site-accommodation",
  "CAT-105": "temporary-fencing-hoarding",
  "CAT-106": "site-power-lighting",
  "CAT-107": "site-consumables",
  "CAT-108": "power-tools",
  "CAT-109": "power-tool-accessories",
  "CAT-110": "site-equipment",
  "CAT-111": "measuring-levels",
  "CAT-112": "carpet-commercial-flooring",
  "CAT-113": "cctv-access-alarms",
  "CAT-114": "industrial-fixings-rivets",
  "CAT-115": "industrial-coatings",
  "CAT-116": "wendy-houses-sheds",
  "CAT-117": "light-steel-frame",
  "CAT-118": "modular-buildings",
  "CAT-119": "farm-fencing-gates",
  "CAT-120": "livestock-water-dams",
  "CAT-121": "shade-net-tunnels",
  "CAT-122": "steel-grating-treads",
  "CAT-123": "mining-consumables",
  "CAT-124": "industrial-flooring-linings",
};
const CODE_BY_SLUG = Object.fromEntries(Object.entries(CATEGORY_CODES).map(([code, slug]) => [slug, code]));

export const PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
];

/** Where we deliver: all nine provinces (national launch, Oct 2026 — Gauteng and KZN were the first markets). */
export const SERVICE_PROVINCES: readonly string[] = PROVINCES;

const TIERS: Record<string, SupplierTier> = { "tier 1": SupplierTier.TIER_1, "tier 2": SupplierTier.TIER_2 };
const TIER_LABEL: Record<SupplierTier, string> = { TIER_1: "Tier 1", TIER_2: "Tier 2" };

const REQUIRED_COLUMNS = ["supplier_id", "supplier_name", "province", "address_location"];
const YES = ["yes", "true", "1", "y"];
const NO = ["no", "false", "0", "n"];

export type ParsedSupplier = {
  externalId: string;
  name: string;
  tier: SupplierTier;
  province: string;
  address: string;
  city: string;
  categorySlugs: string[];
  productNotes: string | null;
  isVerifiedPartner: boolean;
  sourceUrl: string | null;
  // Optional columns: undefined means "not in the file", so existing values are kept.
  latitude?: number | null;
  longitude?: number | null;
  contactName?: string | null;
  contactPhone?: string | null;
  isActive?: boolean;
  /** A Besbpo Group company (e.g. Precast Direct); undefined = column not in the file. */
  isGroupEntity?: boolean;
  explicitTown: boolean;
};

export type CsvError = { line: number; message: string };

/** The public town for a delivery point: the last part of the address ("…, Pietermaritzburg"), skipping a trailing postal code. */
export function townFromAddress(address: string): string {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  while (parts.length > 1 && /^\d{4}$/.test(parts.at(-1)!)) parts.pop();
  return (parts.at(-1) ?? address).replace(/^and\s+/i, "").slice(0, 80);
}

/** South Africa's bounding box — catches swapped latitude/longitude and missing minus signs. */
export function coordinateError(latitude: number, longitude: number): string | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "coordinates must be numbers";
  if (latitude > -22 || latitude < -35.5) return `latitude ${latitude} is outside South Africa (expected about -22 to -35)`;
  if (longitude < 16 || longitude > 33.5) return `longitude ${longitude} is outside South Africa (expected about 16 to 33)`;
  return null;
}

function optionalText(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  return value.trim() || null;
}

export function parseSupplierCsv(text: string): { rows: ParsedSupplier[]; errors: CsvError[] } {
  let records: Record<string, string>[];
  try {
    records = parse(text.replace(/^﻿/, ""), { columns: (header: string[]) => header.map((h) => h.trim().toLowerCase()), skip_empty_lines: true,
      trim: true,
      // Spreadsheets often drop empty trailing cells; treat them as blank.
      relax_column_count: true,
    });
  } catch (error) {
    return { rows: [], errors: [{ line: 0, message: `Not a readable CSV file: ${(error as Error).message}` }] };
  }
  if (records.length === 0) return { rows: [], errors: [{ line: 0, message: "The file has no supplier rows." }] };
  const codesColumn = "category_codes" in records[0] ? "category_codes" : "sku_category_codes";
  const missing = [...REQUIRED_COLUMNS, codesColumn].filter((c) => !(c in records[0]));
  if (!("tier" in records[0]) && !("source_url" in records[0])) missing.push("tier");
  if (missing.length > 0) return { rows: [], errors: [{ line: 1, message: `Missing column(s): ${missing.join(", ")}` }] };

  const rows: ParsedSupplier[] = [];
  const errors: CsvError[] = [];
  const seen = new Set<string>();
  records.forEach((record, index) => {
    const line = index + 2; // header is line 1
    const problems: string[] = [];
    const externalId = record.supplier_id;
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(externalId ?? "")) problems.push("supplier_id is missing or has unexpected characters");
    else if (seen.has(externalId)) problems.push(`supplier_id ${externalId} appears more than once`);
    seen.add(externalId);
    if (!record.supplier_name) problems.push("supplier_name is empty");
    // Researched leads (B2B list) have no tier; they're filed as Tier 2 until qualified.
    const tier = "tier" in record ? TIERS[(record.tier ?? "").toLowerCase()] : SupplierTier.TIER_2;
    if (!tier) problems.push(`tier "${record.tier}" should be "Tier 1" or "Tier 2"`);
    if (!PROVINCES.includes(record.province)) problems.push(`province "${record.province}" isn't a South African province`);
    if (!record.address_location) problems.push("address_location is empty");

    const codes = (record[codesColumn] ?? "").split(/[;,]/).map((c) => c.trim().toUpperCase()).filter(Boolean);
    const unknown = codes.filter((c) => !CATEGORY_CODES[c]);
    if (codes.length === 0) problems.push(`${codesColumn} is empty`);

    const sourceUrl = record.source_url?.trim() || null;
    if (sourceUrl && !/^https?:\/\/\S+$/.test(sourceUrl)) problems.push("source_url must be a web address");
    let isVerifiedPartner = !sourceUrl;
    if ("verified" in record && record.verified !== "") {
      const value = record.verified.toLowerCase();
      if (YES.includes(value)) isVerifiedPartner = true;
      else if (NO.includes(value)) isVerifiedPartner = false;
      else problems.push(`verified "${record.verified}" should be yes or no`);
    }
    if (unknown.length > 0) problems.push(`unknown category code(s): ${unknown.join(", ")}`);

    let latitude: number | null | undefined;
    let longitude: number | null | undefined;
    const hasLat = "latitude" in record && record.latitude !== "";
    const hasLng = "longitude" in record && record.longitude !== "";
    if (hasLat !== hasLng) problems.push("give both latitude and longitude, or neither");
    else if (hasLat) {
      latitude = Number(record.latitude);
      longitude = Number(record.longitude);
      const problem = coordinateError(latitude, longitude);
      if (problem) problems.push(problem);
    }

    let isActive: boolean | undefined;
    if ("active" in record && record.active !== "") {
      const value = record.active.toLowerCase();
      if (YES.includes(value)) isActive = true;
      else if (NO.includes(value)) isActive = false;
      else problems.push(`active "${record.active}" should be yes or no`);
    }

    let isGroupEntity: boolean | undefined;
    if ("group_entity" in record && record.group_entity !== "") {
      const value = record.group_entity.toLowerCase();
      if (YES.includes(value)) isGroupEntity = true;
      else if (NO.includes(value)) isGroupEntity = false;
      else problems.push(`group_entity "${record.group_entity}" should be yes or no`);
    }

    if (problems.length > 0) {
      errors.push({ line, message: `${externalId || "row"}: ${problems.join("; ")}` });
      return;
    }
    const explicitTown = "town" in record && record.town !== "";
    rows.push({
      externalId,
      name: record.supplier_name.slice(0, 200),
      tier,
      province: record.province,
      address: record.address_location.slice(0, 300),
      city: explicitTown ? record.town.slice(0, 80) : townFromAddress(record.address_location),
      explicitTown,
      categorySlugs: [...new Set(codes.map((c) => CATEGORY_CODES[c]))],
      productNotes: optionalText(record.core_categories ?? record.products_notes) ?? null,
      isVerifiedPartner,
      sourceUrl: sourceUrl?.slice(0, 500) ?? null,
      latitude,
      longitude,
      contactName: optionalText(record.contact_name),
      contactPhone: optionalText(record.contact_phone),
      isActive,
      isGroupEntity,
    });
  });
  return { rows, errors };
}

export type ExportableSupplier = {
  externalId: string | null;
  name: string;
  tier: SupplierTier;
  province: string;
  address: string | null;
  productNotes: string | null;
  categorySlugs: string[];
  city: string;
  latitude: number | null;
  longitude: number | null;
  contactName: string | null;
  contactPhone: string | null;
  isActive: boolean;
  isVerifiedPartner: boolean;
  sourceUrl: string | null;
};

export function suppliersToCsv(suppliers: ExportableSupplier[]): string {
  return stringify(
    suppliers.map((s) => ({
      supplier_id: s.externalId ?? "",
      supplier_name: s.name,
      tier: TIER_LABEL[s.tier],
      province: s.province,
      address_location: s.address ?? "",
      core_categories: s.productNotes ?? "",
      category_codes: s.categorySlugs.map((slug) => CODE_BY_SLUG[slug]).filter(Boolean).join(";"),
      town: s.city,
      latitude: s.latitude ?? "",
      longitude: s.longitude ?? "",
      contact_name: s.contactName ?? "",
      contact_phone: s.contactPhone ?? "",
      active: s.isActive ? "yes" : "no",
      verified: s.isVerifiedPartner ? "yes" : "no",
      source_url: s.sourceUrl ?? "",
    })),
    { header: true },
  );
}

/** Great-circle distance in km. Straight-line: road distance is longer. */
export function haversineKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
