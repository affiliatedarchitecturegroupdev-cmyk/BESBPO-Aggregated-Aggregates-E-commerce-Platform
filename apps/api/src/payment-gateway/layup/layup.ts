import { GatewayError, type ProviderPaymentStatus } from "../adapters/payment-gateway-adapter.interface";

/**
 * LayUp — lay-by ("save now, buy later"; docs/payments.md). We create a LayUp
 * order for the amount, the customer sets up their plan on LayUp's page
 * (deposit, then instalments), and the goods are released once it's paid in
 * full. LayUp's API: an `apikey` header, amounts in cents, POST /v1/orders
 * with the products, a minimum deposit percentage and the latest end date;
 * the customer pays on LayUp's shopper widget. We check each plan's progress
 * with LayUp (hourly, and when the customer comes back).
 *
 * Env: LAYUP_API_KEY, LAYUP_MODE ("live", else sandbox). Optional overrides,
 * in case LayUp's paths differ for this account: LAYUP_API_URL (base, e.g.
 * https://api.layup.co.za) and LAYUP_WIDGET_URL (with {id} for the order).
 */
export const LAYUP_ENV = ["LAYUP_API_KEY"] as const;

/** Our lay-by terms (decided for the owner's review): at least 20% down, paid off within 3 months. */
export const LAYUP_TERMS = { depositPercent: 20, maxMonths: 3 };

export type LayupConfig = { apiKey: string; apiUrl: string; widgetUrl: string; mode: "live" | "sandbox" };

export const missingLayupEnv = () => LAYUP_ENV.filter((name) => !process.env[name]?.trim());

export function layupConfig(): LayupConfig | null {
  if (missingLayupEnv().length) return null;
  const live = process.env.LAYUP_MODE?.trim().toLowerCase() === "live";
  return {
    apiKey: process.env.LAYUP_API_KEY!.trim(),
    mode: live ? "live" : "sandbox",
    apiUrl: (process.env.LAYUP_API_URL?.trim() || (live ? "https://api.layup.co.za" : "https://sandbox-api.layup.co.za")).replace(/\/+$/, ""),
    widgetUrl: process.env.LAYUP_WIDGET_URL?.trim() || (live ? "https://shopper.layup.co.za/order/{id}" : "https://shopper-sandbox.layup.co.za/order/{id}"),
  };
}

const toCents = (rand: number) => Math.round(rand * 100);

/** The latest date a plan may end: our maximum term from today, as LayUp's ISO date. */
export function planEndDate(now = new Date(), months = LAYUP_TERMS.maxMonths): string {
  const end = new Date(now);
  end.setMonth(end.getMonth() + months);
  return end.toISOString();
}

/**
 * Builds LayUp's products so they add up to the amount exactly: the order's
 * lines, and the delivery (and anything else) as one more line.
 */
export function layupProducts(lines: { sku: string; name: string; amount: number; link: string }[], total: number) {
  const products = lines.map((l) => ({ amount: toCents(l.amount), sku: l.sku, name: l.name.slice(0, 120), link: l.link }));
  const rest = toCents(total) - products.reduce((n, p) => n + p.amount, 0);
  if (rest > 0) products.push({ amount: rest, sku: "DELIVERY", name: "Delivery", link: products[0]?.link ?? "" });
  return products;
}

/**
 * A LayUp order's progress. LayUp's state names and paid-amount field are read
 * defensively (several spellings) and amounts are cents; "complete" means the
 * plan is paid in full.
 */
export function classifyLayupOrder(order: Record<string, unknown>, totalRand: number): ProviderPaymentStatus {
  const state = String(order.state ?? order.status ?? "").toUpperCase();
  const paidCents = [order.amountPaid, order.paid, order.totalPaid, order.paidAmount].map(Number).find((n) => Number.isFinite(n));
  const paidSoFar = paidCents !== undefined ? paidCents / 100 : undefined;
  if (/COMPLETE|PAID_IN_FULL|FULLY_PAID|^PAID$/.test(state) || (paidSoFar !== undefined && paidSoFar >= totalRand - 0.01)) {
    return { status: "PAID", amount: totalRand, paidSoFar: totalRand, detail: state || undefined };
  }
  if (/CANCEL|EXPIRE|DEFAULT|REFUND/.test(state)) return { status: "FAILED", paidSoFar, detail: state };
  return { status: "PENDING", paidSoFar, detail: state || undefined };
}

export class LayupClient {
  constructor(private readonly config: LayupConfig) {}

  private async request(path: string, init: RequestInit) {
    const response = await fetch(`${this.config.apiUrl}${path}`, {
      ...init,
      headers: { Accept: "application/json", "Content-Type": "application/json", apikey: this.config.apiKey, ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(20_000),
    }).catch((error: Error) => {
      throw new GatewayError(`LayUp unreachable: ${error.message}`);
    });
    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) throw new GatewayError(`LayUp ${path.split("?")[0]} failed (HTTP ${response.status}): ${JSON.stringify(json).slice(0, 300)}`);
    return json;
  }

  async createOrder(input: { paymentId: string; orderNumber: string; amount: number; lines: { sku: string; name: string; amount: number; link: string }[] }) {
    const json = await this.request("/v1/orders", {
      method: "POST",
      body: JSON.stringify({
        products: layupProducts(input.lines, input.amount),
        endDateMax: planEndDate(),
        depositPerc: LAYUP_TERMS.depositPercent,
        depositType: "INSTALMENT",
        reference: input.paymentId,
        name: `Aggregated Aggregates order ${input.orderNumber}`,
      }),
    });
    const id = (typeof json._id === "string" && json._id) || (typeof json.id === "string" && json.id) || "";
    if (!id) throw new GatewayError("LayUp returned no order to send the customer to.");
    return { layupOrderId: id, redirectUrl: this.config.widgetUrl.replace("{id}", encodeURIComponent(id)) };
  }

  async status(layupOrderId: string, totalRand: number): Promise<ProviderPaymentStatus> {
    const json = await this.request(`/v1/orders/${encodeURIComponent(layupOrderId)}`, { method: "GET" });
    const order = (json.order && typeof json.order === "object" ? json.order : json) as Record<string, unknown>;
    return { ...classifyLayupOrder(order, totalRand), providerReference: layupOrderId };
  }
}
