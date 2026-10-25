import { UnitOfSale } from "@aggregates/database";

/**
 * Products staff add in Admin → Catalogue import (docs/catalogue-import.md) aren't in the pricing service's files,
 * so the API sends them with each order. A category's supplier group (`Category.catalogueGroup`) decides the
 * product line — and with it the pricing family and the units the line sells in, mirroring the pricing service
 * (calculators/packaged_goods.py LINE_UNITS). Aggregates and ready-mix are priced from their own bands, so
 * products can't be added to them.
 */
export type AddedLine = "cement" | "steel" | "masonry" | "roofing" | "supplies";

export const LINE_OF_GROUP: Record<string, AddedLine> = {
  "b2b-bulk": "cement",
  steel: "steel",
  masonry: "masonry",
  roofing: "roofing",
  supplies: "supplies",
};

const U = UnitOfSale;
const SHEETS = [U.SHEET_3_0M, U.SHEET_3_6M, U.SHEET_4_2M, U.SHEET_4_8M, U.SHEET_6_0M, U.SHEET_6_6M];
const TIMBER = [U.TIMBER_3_0M, U.TIMBER_3_6M, U.TIMBER_4_2M, U.TIMBER_4_8M, U.TIMBER_6_0M, U.TIMBER_6_6M];

export const LINE_UNITS: Record<AddedLine, UnitOfSale[]> = {
  cement: [U.BAG_25KG, U.BAG_50KG, U.BULK_BAG_1_5T, U.BULK_TANKER_PER_TON, U.DRUM_210L, U.IBC_TOTE_1000L, U.EACH],
  steel: [U.LENGTH_6M, U.LENGTH_12M, U.TONNE, U.SHEET, U.ROLL, U.COIL, U.PACK, U.EACH],
  masonry: [U.THOUSAND, U.EACH, U.ROLL, U.LENGTH_6M],
  roofing: [...SHEETS, ...TIMBER, U.METRE, U.EACH, U.PACK, U.ROLL],
  supplies: [U.EACH, U.PACK, U.ROLL, U.SHEET, U.TONNE, U.SQUARE_METRE, U.LINEAR_METRE, U.CUBIC_METRE, U.KG, U.BUNDLE],
};

/** What the pricing service needs to know about an added product (`added_products` on /calculate/order). */
export type AddedProductPayload = { sku: string; name: string; category_slug: string; line: AddedLine; units: { unit: string; label: string }[] };
