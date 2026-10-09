/**
 * Public site URL, for canonical links and the sitemap. On Render it falls
 * back to the service's own URL until the aggregates.store domain is live
 * (docs/deployment/render.md).
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.RENDER_EXTERNAL_URL ??
  "http://localhost:3000"
).replace(/\/+$/, "");

/** Industries, About and Where We Deliver moved to the footer when plant hire and services joined (Oct 2026). */
export const NAV_LINKS = [
  { href: "/products", label: "Materials" },
  { href: "/reinforcing-steel", label: "Steel" },
  { href: "/plant-hire", label: "Plant Hire" },
  { href: "/services", label: "Services" },
  { href: "/job-packs", label: "Job Packs" },
  { href: "/trade-accounts", label: "Trade Accounts" },
  { href: "/contact", label: "Contact" },
];

export const SALES_EMAIL = "sales@aggregates.store";
