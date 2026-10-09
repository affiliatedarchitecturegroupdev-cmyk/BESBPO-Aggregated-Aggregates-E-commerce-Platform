import type { MetadataRoute } from "next";
import { PRODUCTS } from "@/data/catalogue";
import { CATEGORIES } from "@/data/categories";
import { INDUSTRIES } from "@/data/industries";
import { EXTRA_LINES } from "@/data/extra-lines";
import { PACKAGED_PRODUCTS } from "@/data/packaged";
import { STEEL_PRODUCTS } from "@/data/steel";
import { PLANT, SERVICES } from "@/data/plant-services";
import { READY_MIX_PRODUCTS } from "@/data/ready-mix";
import { getPublishedPosts } from "@/lib/blog";
import { getOpenVacancies } from "@/lib/careers";
import { getHireCoverage, provinceSlug } from "@/lib/hire-coverage";
import { SITE_URL } from "@/lib/site";

const STATIC_PATHS = [
  "",
  "/products",
  "/cement",
  "/ready-mix",
  "/reinforcing-steel",
  "/plant-hire",
  "/services",
  "/job-packs",
  "/estimator",
  "/partners",
  "/partners/onboarding",
  "/plant-hire/how-it-works",
  "/plant-hire/safety",
  "/trade-accounts",
  "/delivery-areas",
  "/coverage",
  "/responsible-sourcing",
  "/careers",
  "/suppliers",
  "/quote",
  "/ways-to-pay",
  "/industries-we-serve",
  "/case-studies",
  "/blog",
  "/faq",
  "/about",
  "/contact",
  "/legal/privacy-policy",
  "/legal/terms-and-conditions",
  "/legal/hire-terms",
  "/legal/partner-terms",
  "/legal/popia-notice",
  "/legal/cookie-policy",
  "/legal/returns-refunds",
  "/legal/shipping-delivery",
  "/legal/paia-manual",
  "/photo-credits",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, vacancies, coverage] = await Promise.all([getPublishedPosts(), getOpenVacancies(), getHireCoverage()]);
  return [
    ...STATIC_PATHS.map((path) => ({ url: `${SITE_URL}${path}` })),
    ...CATEGORIES.map((c) => ({ url: `${SITE_URL}/products?category=${c.slug}` })),
    ...INDUSTRIES.map((i) => ({ url: `${SITE_URL}/products?industry=${i.slug}` })),
    ...EXTRA_LINES.map((l) => ({ url: `${SITE_URL}${l.path}` })),
    ...PLANT.map((p) => ({ url: `${SITE_URL}/plant-hire/${p.slug}` })),
    // Province pages only where partners are active (never promise coverage we don't have).
    ...(coverage.length ? [{ url: `${SITE_URL}/plant-hire/areas` }] : []),
    ...coverage.map((c) => ({ url: `${SITE_URL}/plant-hire/areas/${provinceSlug(c.province)}` })),
    ...SERVICES.map((s) => ({ url: `${SITE_URL}/services/${s.slug}` })),
    ...[...PRODUCTS, ...PACKAGED_PRODUCTS, ...READY_MIX_PRODUCTS, ...STEEL_PRODUCTS].map((p) => ({ url: `${SITE_URL}/products/${p.slug}` })),
    ...posts.map((p) => ({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: p.updatedAt })),
    ...vacancies.map((v) => ({ url: `${SITE_URL}/careers/${v.slug}`, lastModified: v.publishedAt ?? undefined })),
  ];
}
