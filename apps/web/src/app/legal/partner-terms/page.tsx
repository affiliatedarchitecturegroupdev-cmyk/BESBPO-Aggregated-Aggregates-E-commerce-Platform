import { MarkdownLegalPage } from "@/components/legal/MarkdownLegalPage";

// Awaiting attorney review before it's final — status in content/legal/README.md (internal; never shown on the page).
export const metadata = { title: "Partner Terms — Aggregated Aggregates", alternates: { canonical: "/legal/partner-terms" } };

export default function PartnerTermsPage() {
  return <MarkdownLegalPage filename="partner-terms.md" />;
}
