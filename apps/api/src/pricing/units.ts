import { UnitOfSale } from "@aggregates/database";
import { PACKAGED_UNITS, type PackagedUnit, type PricingUnit } from "./pricing.service";

const BULK: Record<"ton" | "m3" | "bag", UnitOfSale> = { ton: UnitOfSale.BULK_TON, m3: UnitOfSale.BULK_M3, bag: UnitOfSale.BAGGED };

/** The stored unit of sale for a pricing-service unit (packaged units share their names). */
export function unitOfSale(unit: PricingUnit): UnitOfSale {
  return unit in BULK ? BULK[unit as keyof typeof BULK] : UnitOfSale[unit as PackagedUnit];
}

/** The pricing-service unit for a stored unit of sale. */
export function pricingUnit(unit: UnitOfSale): PricingUnit {
  if (unit === UnitOfSale.BULK_TON) return "ton";
  if (unit === UnitOfSale.BULK_M3) return "m3";
  if (unit === UnitOfSale.BAGGED) return "bag";
  if ((PACKAGED_UNITS as readonly string[]).includes(unit)) return unit as PackagedUnit;
  throw new Error(`Unhandled unit of sale: ${unit}`);
}
