import type { MetadataRoute } from "next";
import { PRODUCTS } from "@/data/catalogue";
import { SITE_URL } from "@/lib/site";

const STATIC_PATHS = [
  "",
  "/products",
  "/trade-accounts",
  "/delivery-areas",
  "/quote",
  "/about",
  "/contact",
  "/legal/privacy-policy",
  "/legal/terms-and-conditions",
  "/legal/popia-notice",
  "/legal/cookie-policy",
  "/legal/returns-refunds",
  "/legal/shipping-delivery",
  "/legal/paia-manual",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...STATIC_PATHS.map((path) => ({ url: `${SITE_URL}${path}` })),
    ...PRODUCTS.map((p) => ({ url: `${SITE_URL}/products/${p.slug}` })),
  ];
}
