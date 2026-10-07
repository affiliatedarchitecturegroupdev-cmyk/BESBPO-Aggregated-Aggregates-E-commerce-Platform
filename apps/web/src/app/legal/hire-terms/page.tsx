import { MarkdownLegalPage } from "@/components/legal/MarkdownLegalPage";

// Awaiting attorney review before it's final — status in content/legal/README.md (internal; never shown on the page).
export const metadata = { title: "Plant Hire & Site Services Terms — Aggregated Aggregates", alternates: { canonical: "/legal/hire-terms" } };

export default function HireTermsPage() {
  return <MarkdownLegalPage filename="hire-terms.md" />;
}
