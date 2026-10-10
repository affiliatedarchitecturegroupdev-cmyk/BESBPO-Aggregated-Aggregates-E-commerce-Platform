import { BadGatewayException, HttpException, Injectable } from "@nestjs/common";

export type CustomerTierName = "RETAIL" | "CONTRACTOR_TRADE" | "VOLUME_CIVIL_BULK";
export const PACKAGED_UNITS = [
  "BAG_25KG",
  "BAG_50KG",
  "BULK_BAG_1_5T",
  "BULK_TANKER_PER_TON",
  "DRUM_210L",
  "IBC_TOTE_1000L",
  // Steel (CAT-15..18) is priced through the same packaged-goods path.
  "LENGTH_6M",
  "LENGTH_12M",
  "TONNE",
  "SHEET",
  "ROLL",
  "COIL",
  "PACK",
  "EACH",
  // Masonry (CAT-19/20): bricks per 1,000 — blocks, lintels and DPC reuse EACH and ROLL.
  "THOUSAND",
] as const;
export type PackagedUnit = (typeof PACKAGED_UNITS)[number];
export type PricingUnit = "ton" | "m3" | "bag" | PackagedUnit;

type TonnageVolumeRequest = {
  sku: string;
  quantity: number;
  unit: PricingUnit;
  customerTier: CustomerTierName;
};

type DeliveryFeeRequest = {
  distanceKm: number;
  bulkM3?: number;
  bulkTons?: number;
  baggedKg?: number;
  customerTier: CustomerTierName;
};

type OrderRequest = {
  lines: { sku: string; quantity: number; unit: PricingUnit }[];
  distanceKm: number;
  customerTier: CustomerTierName;
};

export type QuoteOnlyReasonCode =
  | "VOLUME_THRESHOLD"
  | "OVER_MAX_DISTANCE"
  | "SMALL_LOAD_OUT_OF_RANGE"
  | "BAGGED_OUT_OF_RANGE"
  | "NO_MATCHING_BAND"
  | "PRICE_ON_REQUEST" // a packaged unit with no confirmed price
  | "PACKAGED_BULK_DELIVERY"; // bulk-bag / tanker / drum / tote delivery

export type PricedLine = {
  sku: string;
  unit: PricingUnit;
  quantity: number;
  equivalent_tons: number;
  equivalent_m3: number;
  /** null for a packaged unit with no confirmed price (pricing_status says why). */
  list_unit_price: number | null;
  unit_price: number | null;
  total: number | null;
  unit_label?: string;
  pricing_status?: string;
  /** Cost per unit (list / (1 + markup)) and pricing family — snapshotted on orders, admin-only. */
  unit_cost?: number | null;
  family?: string;
};

export type DeliveryQuote = {
  is_quote_only: boolean;
  reason: string | null;
  reasons: string[];
  load_size: "M3_6" | "M3_10" | "M3_14_PLUS" | null;
  fee: number | null;
};

export type PricedOrder = {
  customer_tier: CustomerTierName;
  is_quote_only: boolean;
  reasons: string[];
  reason_codes: QuoteOnlyReasonCode[];
  lines: PricedLine[];
  subtotal: number;
  delivery: DeliveryQuote;
  total: number | null;
};

/**
 * On Render the pricing service is a private service and its address arrives
 * as a bare internal "host:port" (render.yaml fromService.hostport).
 */
function normaliseBaseUrl(url: string): string {
  const withScheme = /^https?:\/\//.test(url) ? url : `http://${url}`;
  return withScheme.replace(/\/+$/, "");
}

/** A plant-hire or site-service line from the pricing service's CAT-13/14 catalogue. */
export type HireItem = { sku: string; name: string; kind: "PLANT" | "SERVICE"; unit: string | null };
export type HireCatalogue = { commissionPercent: number; items: Map<string, HireItem> };

@Injectable()
export class PricingService {
  private readonly baseUrl = normaliseBaseUrl(process.env.PRICING_SERVICE_URL ?? "http://localhost:8000");
  private hireCache: { at: number; value: HireCatalogue } | null = null;

  /** CAT-13/14 SKUs and the Agent commission, cached for five minutes (bookings validate against it). */
  async hireCatalogue(): Promise<HireCatalogue> {
    if (this.hireCache && Date.now() - this.hireCache.at < 300_000) return this.hireCache.value;
    const [plant, services] = await Promise.all([this.get("/products/plant-hire"), this.get("/products/site-services")]);
    const items = new Map<string, HireItem>();
    for (const p of plant.plant as { sku: string; name: string }[]) items.set(p.sku, { sku: p.sku, name: p.name, kind: "PLANT", unit: null });
    for (const s of services.services as { sku: string; name: string; unit: string }[]) items.set(s.sku, { sku: s.sku, name: s.name, kind: "SERVICE", unit: s.unit });
    const value = { commissionPercent: Number(plant.commission_percent), items };
    if (!Number.isFinite(value.commissionPercent)) throw new BadGatewayException("Pricing service didn't return the hire commission.");
    this.hireCache = { at: Date.now(), value };
    return value;
  }

  private async get(path: string) {
    const response = await fetch(`${this.baseUrl}${path}`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new BadGatewayException(`Pricing service error: ${response.status}`);
    return response.json();
  }

  async health(): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  }

  calculateTonnageVolume(req: TonnageVolumeRequest) {
    return this.post("/calculate/tonnage-volume", {
      sku: req.sku,
      quantity: req.quantity,
      unit: req.unit,
      customer_tier: req.customerTier,
    });
  }

  calculateDeliveryFee(req: DeliveryFeeRequest): Promise<DeliveryQuote> {
    return this.post("/calculate/delivery-fee", {
      distance_km: req.distanceKm,
      bulk_m3: req.bulkM3 ?? 0,
      bulk_tons: req.bulkTons ?? 0,
      bagged_kg: req.baggedKg ?? 0,
      customer_tier: req.customerTier,
    });
  }

  /** Prices every line plus delivery for the whole load — what checkout uses. */
  calculateOrder(req: OrderRequest): Promise<PricedOrder> {
    return this.post("/calculate/order", {
      lines: req.lines,
      distance_km: req.distanceKm,
      customer_tier: req.customerTier,
    });
  }

  private async post(path: string, body: unknown) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    if (response.ok) {
      return JSON.parse(text);
    }
    // Pass the pricing service's validation errors (unknown SKU, unit not
    // offered, bad quantity) through to the caller; anything else is ours.
    if (response.status === 404 || response.status === 422) {
      throw new HttpException(JSON.parse(text), response.status);
    }
    throw new BadGatewayException(`Pricing service error: ${response.status} ${text}`);
  }
}
