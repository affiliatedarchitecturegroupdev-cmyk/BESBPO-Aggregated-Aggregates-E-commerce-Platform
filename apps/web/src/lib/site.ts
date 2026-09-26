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

export const NAV_LINKS = [
  { href: "/products", label: "Products" },
  { href: "/trade-accounts", label: "Trade Accounts" },
  { href: "/delivery-areas", label: "Delivery Areas" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export const SALES_EMAIL = "sales@aggregates.store";
