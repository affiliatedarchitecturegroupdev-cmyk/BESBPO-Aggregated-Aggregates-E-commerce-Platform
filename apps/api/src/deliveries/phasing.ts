/**
 * Phased deliveries (docs/deliveries.md): pure rules for splitting an order
 * into dated drops, and for when a drop may leave the supplier.
 */

export const MAX_DROPS = 12;
export const MAX_DAYS_AHEAD = 366;

export type PlanLine = { id: string; name: string; quantity: number; lineTotal: number };
export type PlanDropInput = { scheduledFor: string; lines: { lineItemId: string; quantity: number }[]; notes?: string | null };
export type PlannedDrop = { sequence: number; scheduledFor: Date; lines: { lineItemId: string; quantity: number }[]; value: number; notes: string | null };

const EPS = 1e-6;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A YYYY-MM-DD day as a UTC midnight Date, or null if it isn't a real date. */
export function parseDay(day: string): Date | null {
  if (!DAY.test(day)) return null;
  const d = new Date(`${day}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== day ? null : d;
}

/** Today in South Africa, as YYYY-MM-DD. */
export function saToday(now = new Date()): string {
  return new Date(now.getTime() + 2 * 3_600_000).toISOString().slice(0, 10);
}

/**
 * Checks a plan and works out each drop's value. Every line must be covered
 * exactly by the drops; each drop is after today and within a year. Drops are
 * numbered in date order. Values are the materials at the order's prices,
 * split in cents so they add up to each line's total exactly.
 */
export function planDrops(lines: PlanLine[], input: PlanDropInput[], today: string): PlannedDrop[] {
  if (input.length < 2) throw new Error("A phased delivery has at least two drops — for one delivery, keep the standard delivery.");
  if (input.length > MAX_DROPS) throw new Error(`At most ${MAX_DROPS} drops per order — for more, ask us for a supply agreement.`);
  const first = parseDay(today)!;
  const last = new Date(first.getTime() + MAX_DAYS_AHEAD * 86_400_000);
  const byId = new Map(lines.map((l) => [l.id, l]));
  const covered = new Map<string, number>();

  const drops = input.map((d, index) => {
    const date = parseDay(d.scheduledFor);
    if (!date) throw new Error(`Drop ${index + 1}: choose a date.`);
    if (date <= first) throw new Error(`Drop ${index + 1}: the earliest date is tomorrow.`);
    if (date > last) throw new Error(`Drop ${index + 1}: dates can be up to a year ahead.`);
    const merged = new Map<string, number>();
    for (const l of d.lines) {
      if (!(l.quantity > 0)) continue;
      const line = byId.get(l.lineItemId);
      if (!line) throw new Error(`Drop ${index + 1}: that product isn't on this order.`);
      if (Number.isInteger(line.quantity) && !Number.isInteger(l.quantity)) throw new Error(`Drop ${index + 1}: ${line.name} is ordered in whole units.`);
      merged.set(l.lineItemId, (merged.get(l.lineItemId) ?? 0) + l.quantity);
    }
    if (merged.size === 0) throw new Error(`Drop ${index + 1} has nothing on it.`);
    for (const [id, q] of merged) covered.set(id, (covered.get(id) ?? 0) + q);
    return { date, index, lines: [...merged.entries()].map(([lineItemId, quantity]) => ({ lineItemId, quantity })), notes: d.notes?.trim() || null };
  });

  for (const line of lines) {
    const q = covered.get(line.id) ?? 0;
    if (Math.abs(q - line.quantity) > EPS) {
      throw new Error(`${line.name}: the drops add up to ${round3(q)}, but ${round3(line.quantity)} is ordered — split it so every unit is delivered once.`);
    }
  }

  drops.sort((a, b) => a.date.getTime() - b.date.getTime() || a.index - b.index);

  // Values in cents: each line's total shared by quantity, the last drop carrying that line taking what's left.
  const cents = drops.map(() => 0);
  for (const line of lines) {
    const total = Math.round(line.lineTotal * 100);
    const holders = drops.map((d, i) => ({ i, q: d.lines.find((l) => l.lineItemId === line.id)?.quantity ?? 0 })).filter((h) => h.q > 0);
    let left = total;
    holders.forEach((h, k) => {
      const share = k === holders.length - 1 ? left : Math.round((total * h.q) / line.quantity);
      cents[h.i] += share;
      left -= share;
    });
  }

  return drops.map((d, i) => ({ sequence: i + 1, scheduledFor: d.date, lines: d.lines, value: cents[i] / 100, notes: d.notes }));
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

export type GateOrder = { total: number; amountPaid: number; paymentPlan: string };
export type GateDrop = { id: string; status: string; value: number };

/**
 * How much must be paid before a drop leaves: the delivery (and any express)
 * fee with the first drop, plus the materials on every drop dispatched so far
 * and this one. Orders on account (trade credit) aren't held. Returns the
 * refusal message, or null if it can go.
 */
export function dropDispatchRefusal(order: GateOrder, drops: GateDrop[], dropId: string): string | null {
  if (order.paymentPlan === "ACCOUNT") return null;
  const live = drops.filter((d) => d.status !== "CANCELLED");
  const fees = Math.max(0, order.total - live.reduce((n, d) => n + d.value, 0));
  const released = live.filter((d) => d.id === dropId || d.status === "DISPATCHED" || d.status === "DELIVERED").reduce((n, d) => n + d.value, 0);
  const required = Math.round((fees + released) * 100) / 100;
  const short = Math.round((required - order.amountPaid) * 100) / 100;
  if (short > 0.01) return `R${short.toFixed(2)} more must be paid before this drop leaves (R${required.toFixed(2)} covers the delivery fee and every drop up to this one) — send a payment link or record the EFT.`;
  return null;
}
