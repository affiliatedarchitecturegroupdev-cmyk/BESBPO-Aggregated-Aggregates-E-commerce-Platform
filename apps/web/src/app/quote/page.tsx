import type { Metadata } from "next";
import { Suspense } from "react";
import { QuoteRequestForm } from "@/components/quote/QuoteRequestForm";

export const metadata: Metadata = {
  title: "Request a Bulk Quote",
  description: "Delivered pricing for civil bulk orders, deliveries beyond 100km, and trade loads.",
};

export default function QuotePage() {
  // The form reads its prefill (?sku=&unit=&qty=&km=) from the URL, which needs a Suspense boundary on a static page.
  return (
    <Suspense>
      <QuoteRequestForm />
    </Suspense>
  );
}
