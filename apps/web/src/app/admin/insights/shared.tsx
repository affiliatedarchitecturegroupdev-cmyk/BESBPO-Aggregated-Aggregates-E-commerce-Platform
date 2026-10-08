import { Suspense } from "react";
import { FilterBar, type FilterControl } from "@/components/insights/FilterBar";
import { api } from "@/lib/api";
import { PROVINCES } from "@/lib/careers";
import { LABELS, RANGES, pageQuery, resolveRange, type Filters, type Meta } from "@/lib/insights";

type ControlKey = "compare" | "granularity" | "businessLine" | "province" | "tier" | "channel" | "paymentMethod" | "family" | "category";

const opts = (group: keyof typeof LABELS, all: string, skip: string[] = []) => [
  { value: "", label: all },
  ...Object.entries(LABELS[group])
    .filter(([k]) => k && !skip.includes(k))
    .map(([value, label]) => ({ value, label })),
];

/** The filter row for a page, with only the controls that page uses. */
export async function InsightsFilters({ f, controls }: { f: Filters; controls: ControlKey[] }) {
  const { from, to } = resolveRange(f);
  const categories = controls.includes("category") ? await api<{ slug: string; name: string }[]>("/categories") : null;
  const all: Record<ControlKey, FilterControl> = {
    compare: { key: "compare", label: "Compare with", options: [{ value: "", label: LABELS.compare.previous }, { value: "year", label: LABELS.compare.year }, { value: "none", label: LABELS.compare.none }] },
    granularity: { key: "granularity", label: "Show by", options: opts("granularity", "Automatic") },
    businessLine: { key: "businessLine", label: "Business line", options: opts("businessLine", "Materials & hire", ["ALL"]) },
    province: { key: "province", label: "Province", options: [{ value: "", label: "All provinces" }, ...PROVINCES.map((p) => ({ value: p, label: p }))] },
    tier: { key: "tier", label: "Customer tier", options: opts("tier", "All tiers", ["UNKNOWN"]) },
    channel: { key: "channel", label: "Channel", options: opts("channel", "All channels") },
    paymentMethod: { key: "paymentMethod", label: "Payment method", options: opts("paymentMethod", "All methods", ["UNKNOWN"]) },
    family: { key: "family", label: "Product family", options: opts("family", "All families", ["UNKNOWN"]) },
    category: {
      key: "category",
      label: "Category",
      options: [{ value: "", label: "All categories" }, ...(categories?.ok ? categories.data.map((c) => ({ value: c.slug, label: c.name })) : [])],
    },
  };
  return (
    <Suspense>
      <FilterBar ranges={RANGES.map((r) => ({ value: r.value, label: r.label }))} controls={controls.map((k) => all[k])} from={from} to={to} />
    </Suspense>
  );
}

/** The CSV download link for one view, with the page's filters. */
export function csvHref(view: "timeseries" | "breakdown" | "pnl", f: Filters, extra: Record<string, string | undefined> = {}) {
  return `/api/admin/insights/${view}?${pageQuery(f, extra)}`;
}

/** "vs previous period" wording for deltas. */
export function vsLabel(meta: Meta) {
  if (!meta.comparison) return undefined;
  return meta.comparison.kind === "year" ? "last year" : "previous period";
}

export function vatNote(meta: Pick<Meta, "vatBasis">) {
  return meta.vatBasis === "EX_VAT"
    ? "Amounts are excluding VAT."
    : "Amounts are as charged. They will show excluding VAT once storefront prices are confirmed VAT-inclusive (PRICES_INCLUDE_VAT on Render).";
}

export function scopeNote(meta: Meta) {
  const missing = [];
  if (!meta.includes.deliveryAndRefunds && meta.includes.materials) missing.push("delivery fees, delivery costs and refunds");
  if (!meta.includes.hire) missing.push("hire");
  if (!meta.includes.operatingCosts) missing.push("operating costs");
  return missing.length && Object.keys(meta.filters).length ? `With these filters, this view leaves out ${missing.join(", ")} — they belong to whole orders or the whole business, not to one product, tier or province.` : null;
}
