import type { Metadata } from "next";
import Link from "next/link";
import { DELIVERY_RULES } from "@/data/catalogue";
import { NearestDeliveryPointFinder } from "@/components/suppliers/NearestDeliveryPointFinder";
import { CATEGORIES } from "@/data/categories";
import { apiCached } from "@/lib/api";
import { formatZAR } from "@/lib/pricing";
import { PROVINCES, type Coverage } from "@/lib/suppliers";

export const metadata: Metadata = {
  title: "Delivery Areas & Charges",
  description: "Tipper-truck delivery from our approved partner-supplier network, with distance-banded charges.",
};

const LOADS = [
  { size: "M3_6", label: "6m³ load", detail: "~9–10 ton tipper" },
  { size: "M3_10", label: "10m³ load", detail: "~15–16 ton tipper" },
  { size: "M3_14_PLUS", label: "14m³+ load", detail: "34-ton Interlink" },
] as const;

const CATEGORY_NAME = new Map(CATEGORIES.map((c) => [c.slug, c.name]));

/**
 * Module 6: Supplier & Delivery-Point Locator (public view). Coverage comes
 * from the live partner-supplier network: provinces, towns and material
 * categories, never supplier names or contacts. When the API can't be
 * reached (e.g. at build time) it falls back to the launch provinces.
 */
export default async function DeliveryAreasPage() {
  const [included, ...banded] = DELIVERY_RULES.bands;
  const coverage = await apiCached<Coverage>("/suppliers/coverage");
  const live = coverage && coverage.deliveryPoints > 0 ? coverage.provinces : null;
  const served = new Set(live?.map((p) => p.province) ?? ["KwaZulu-Natal", "Gauteng"]);
  const upcoming = PROVINCES.filter((p) => !served.has(p));
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-seam-blue">Delivery Areas</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-basalt">Delivered from the nearest partner supplier</h1>
      <p className="mt-3 max-w-3xl font-body text-sm text-slate">
        Aggregated Aggregates sources from an approved network of partner suppliers rather than its own yards.
        Every delivery is measured from the partner supplier nearest your site and carried by Besfleet, the Group&apos;s
        own fleet, or one of 15+ tipper-truck delivery partners.{" "}
        <Link href="/suppliers" className="text-seam-blue hover:underline">Meet the partner network →</Link>
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {live
          ? live.map((p) => (
              <div key={p.province} className="rounded-sm border border-basalt/10 bg-white p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-body text-sm font-semibold text-basalt">{p.province}</p>
                  <p className="font-mono text-[11px] text-seam-blue">Delivering now</p>
                </div>
                <p className="mt-1 font-body text-xs text-slate">
                  {p.deliveryPoints} partner supplier{p.deliveryPoints === 1 ? "" : "s"} across {p.towns.length} town
                  {p.towns.length === 1 ? "" : "s"}: {p.towns.join(", ")}
                </p>
                <p className="mt-2 font-body text-xs text-basalt">{p.categories.map((c) => CATEGORY_NAME.get(c) ?? c).join(" · ")}</p>
              </div>
            ))
          : [...served].map((province) => (
              <div key={province} className="rounded-sm border border-basalt/10 bg-white p-5">
                <p className="font-body text-sm font-semibold text-basalt">{province}</p>
                <p className="mt-1 font-mono text-[11px] text-seam-blue">Delivering now</p>
              </div>
            ))}
      </div>
      {upcoming.length > 0 && (
        <p className="mt-3 font-body text-xs text-slate">
          Coming as the partner network grows: {upcoming.join(", ")}. Need material there now?{" "}
          <Link href="/quote" className="text-seam-blue hover:underline">Request a quote</Link>.
        </p>
      )}

      {(coverage?.withCoordinates ?? 0) > 0 && (
        <div className="mt-8">
          <NearestDeliveryPointFinder quoteOverKm={DELIVERY_RULES.quoteOverKm} />
        </div>
      )}

      <h2 className="mt-12 font-display text-xl font-bold text-basalt">Bulk tipper delivery charges</h2>
      <div className="mt-4 overflow-x-auto rounded-sm border border-basalt/10 bg-white">
        <table className="w-full min-w-[560px] text-left font-body text-sm">
          <thead>
            <tr className="border-b border-basalt/10 text-xs text-slate">
              <th className="px-4 py-3">Distance</th>
              {LOADS.map((l) => (
                <th key={l.size} className="px-4 py-3">
                  {l.label}
                  <span className="block font-normal">{l.detail}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-basalt/5">
              <td className="px-4 py-3">{included.minKm}–{included.maxKm}km</td>
              <td colSpan={3} className="px-4 py-3 font-semibold text-seam-blue">Included in list price</td>
            </tr>
            {banded.map((band) => (
              <tr key={band.label} className="border-b border-basalt/5">
                <td className="px-4 py-3">{band.minKm}–{band.maxKm}km</td>
                {LOADS.map((l) => (
                  <td key={l.size} className="px-4 py-3">{formatZAR(band.fees[l.size] ?? 0)}</td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="px-4 py-3">Over {DELIVERY_RULES.quoteOverKm}km</td>
              <td colSpan={3} className="px-4 py-3">
                Quoted individually — <Link href="/quote" className="text-seam-blue hover:underline">request a quote</Link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-sm border border-basalt/10 bg-white p-5">
          <p className="font-body text-sm font-semibold text-basalt">Minimum tipper load</p>
          <p className="mt-1 font-body text-sm text-slate">
            {DELIVERY_RULES.minBulkM3}m³ or {DELIVERY_RULES.minBulkTons} tons, whichever suits the material.
          </p>
        </div>
        <div className="rounded-sm border border-basalt/10 bg-white p-5">
          <p className="font-body text-sm font-semibold text-basalt">Smaller bulk orders</p>
          <p className="mt-1 font-body text-sm text-slate">
            Bakkie/LDV small load for a flat {formatZAR(DELIVERY_RULES.smallLoadFee)}, within {DELIVERY_RULES.smallLoadMaxKm}km.
          </p>
        </div>
        <div className="rounded-sm border border-basalt/10 bg-white p-5">
          <p className="font-body text-sm font-semibold text-basalt">Bagged & palletised</p>
          <p className="mt-1 font-body text-sm text-slate">
            {formatZAR(DELIVERY_RULES.baggedFee)} under {DELIVERY_RULES.baggedFreeFromKg / 1000} ton, free from{" "}
            {DELIVERY_RULES.baggedFreeFromKg / 1000} ton, within {DELIVERY_RULES.baggedMaxKm}km.
          </p>
        </div>
      </div>
      <p className="mt-6 font-body text-xs text-slate">
        Volume/Civil Bulk account orders of 10m³ or more are quoted with delivered pricing. Full terms:{" "}
        <Link href="/legal/shipping-delivery" className="text-seam-blue underline">Shipping & Delivery Policy</Link>.
      </p>
    </div>
  );
}
