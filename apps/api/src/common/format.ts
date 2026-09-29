import type { UnitOfSale } from "@aggregates/database";

/** Money as Prisma returns it (Decimal), or a plain number/string. */
export type Money = number | string | { toString(): string };

export const UNIT_LABEL: Record<UnitOfSale, string> = {
  BULK_TON: "ton",
  BULK_M3: "m³",
  BAGGED: "bags",
  BAG_25KG: "× 25kg bag",
  BAG_50KG: "× 50kg bag",
  BULK_BAG_1_5T: "× 1.5-ton bulk bag",
  BULK_TANKER_PER_TON: "ton (tanker)",
  DRUM_210L: "× 210L drum",
  IBC_TOTE_1000L: "× 1,000L tote",
};

const ZAR = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "R1,234.56" — the same style as the storefront. */
export function formatZAR(value: Money): string {
  const n = Number(value.toString());
  return `${n < 0 ? "-" : ""}R${ZAR.format(Math.abs(n))}`;
}

export function formatDateZA(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg", day: "numeric", month: "long", year: "numeric" });
}

/**
 * Who sells: Aggregated Aggregates trades as a division of Besbpo Group and
 * bills under the Group's VAT registration (Terms & Conditions). Same details
 * as the storefront's corporate-contact data.
 */
export const SELLER = {
  tradingName: "Aggregated Aggregates",
  legalName: "Besbpo Group (Pty) Ltd",
  addressLines: ["2 Ncondo Place, Ridgeside Dr", "Umhlanga Ridge, Durban, KwaZulu-Natal, 4319"],
  phone: "087 265 2505",
  email: "sales@aggregates.store",
  website: "aggregates.store",
};
