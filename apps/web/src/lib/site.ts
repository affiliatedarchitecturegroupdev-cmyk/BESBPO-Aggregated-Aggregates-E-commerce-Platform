/**
 * Public site URL, for canonical links, the sitemap and structured data:
 * NEXT_PUBLIC_SITE_URL when set, otherwise the live domain on Render
 * (aaggregates.store, DNS on Cloudflare — docs/deployment/render.md) and
 * localhost in development.
 */
export const LIVE_SITE_URL = "https://aaggregates.store";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.RENDER ? LIVE_SITE_URL : "http://localhost:3000")).replace(/\/+$/, "");

/** Industries, About and Where We Deliver moved to the footer when plant hire and services joined (Oct 2026). */
export const NAV_LINKS = [
  { href: "/products", label: "Materials" },
  { href: "/reinforcing-steel", label: "Steel" },
  { href: "/plant-hire", label: "Plant Hire" },
  { href: "/services", label: "Services" },
  { href: "/design", label: "Design" },
  { href: "/job-packs", label: "Job Packs" },
  { href: "/trade-accounts", label: "Trade Accounts" },
  { href: "/contact", label: "Contact" },
];

export const SALES_EMAIL = "sales@aaggregates.store";
