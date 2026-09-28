import type { Metadata } from "next";
import { PromoSlot } from "@/components/merchandising/PromoSlot";
import { QuoteRequestForm, type QuotePrefill } from "@/components/quote/QuoteRequestForm";
import { getHiddenSkus } from "@/lib/cms";
import { getActivePromotions } from "@/lib/promotions";

export const metadata: Metadata = {
  title: "Request a Bulk Quote",
  description: "Delivered pricing for civil bulk orders, deliveries beyond 100km, trade loads, and bulk cement and admixtures.",
};

export default async function QuotePage({ searchParams }: { searchParams: QuotePrefill }) {
  const [hiddenSkus, promotions] = await Promise.all([getHiddenSkus(), getActivePromotions()]);
  // The prefill (?sku=&unit=&qty=&km=) is read here, on the server: a client-side useSearchParams on a
  // static page remounts the form (losing the confirmation) when the submit action refreshes the route.
  const prefill = {
    sku: typeof searchParams.sku === "string" ? searchParams.sku : undefined,
    unit: typeof searchParams.unit === "string" ? searchParams.unit : undefined,
    qty: typeof searchParams.qty === "string" ? searchParams.qty : undefined,
    km: typeof searchParams.km === "string" ? searchParams.km : undefined,
  };
  return <QuoteRequestForm hiddenSkus={hiddenSkus} prefill={prefill} upsell={<PromoSlot promotion={promotions.QUOTE_FLOW_UPSELL} />} />;
}
