import type { MetadataRoute } from "next";
import { PRODUCTS } from "@/data/catalogue";
import { CATEGORIES } from "@/data/categories";
import { INDUSTRIES } from "@/data/industries";
import { EXTRA_LINES } from "@/data/extra-lines";
import { PACKAGED_PRODUCTS } from "@/data/packaged";
import { MASONRY_PRODUCTS } from "@/data/masonry";
import { ROOFING_PRODUCTS } from "@/data/roofing";
import { DESIGN_SERVICES } from "@/data/design-services";
import { STEEL_PRODUCTS } from "@/data/steel";
import { PLANT, SERVICES } from "@/data/plant-services";
import { READY_MIX_PRODUCTS } from "@/data/ready-mix";
import { getPublishedPosts } from "@/lib/blog";
import { getOpenVacancies } from "@/lib/careers";
import { getHireCoverage, provinceSlug } from "@/lib/hire-coverage";
import { SITE_URL } from "@/lib/site";
import { policyVersions } from "@/lib/legal-content";

/** Legal page path → its Markdown file, so the sitemap carries each policy's last-updated date. */
const LEGAL_FILES: Record<string, string> = {
  "/legal/privacy-policy": "privacy-policy.md",
  "/legal/terms-and-conditions": "terms-and-conditions.md",
  "/legal/hire-terms": "hire-terms.md",
  "/legal/partner-terms": "partner-terms.md",
  "/legal/popia-notice": "popia-notice.md",
  "/legal/cookie-policy": "cookie-policy.md",
  "/legal/returns-refunds": "returns-refunds-policy.md",
  "/legal/handling-fee": "handling-fee-policy.md",
  "/legal/shipping-delivery": "shipping-delivery-policy.md",
  "/legal/paia-manual": "paia-manual.md",
};

const STATIC_PATHS = [
  "",
  "/products",
  "/cement",
  "/ready-mix",
  "/reinforcing-steel",
  "/bricks-blocks",
  "/paving",
  "/drainage",
  "/roofing",
  "/reinforcing-steel/cut-and-bend",
  "/plant-hire",
  "/services",
  "/job-packs",
  "/design",
  "/calculators",
  "/estimator",
  "/shop-by-stage",
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
    ...STATIC_PATHS.map((path) => ({ url: `${SITE_URL}${path}`, ...(LEGAL_FILES[path] ? { lastModified: policyVersions(LEGAL_FILES[path])[0].date } : {}) })),
    ...CATEGORIES.map((c) => ({ url: `${SITE_URL}/products?category=${c.slug}` })),
    ...INDUSTRIES.map((i) => ({ url: `${SITE_URL}/products?industry=${i.slug}` })),
    ...EXTRA_LINES.map((l) => ({ url: `${SITE_URL}${l.path}` })),
    ...PLANT.map((p) => ({ url: `${SITE_URL}/plant-hire/${p.slug}` })),
    // Province pages only where partners are active (never promise coverage we don't have).
    ...(coverage.length ? [{ url: `${SITE_URL}/plant-hire/areas` }] : []),
    ...coverage.map((c) => ({ url: `${SITE_URL}/plant-hire/areas/${provinceSlug(c.province)}` })),
    ...SERVICES.map((s) => ({ url: `${SITE_URL}/services/${s.slug}` })),
    ...DESIGN_SERVICES.map((s) => ({ url: `${SITE_URL}/design/${s.slug}` })),
    ...[...PRODUCTS, ...PACKAGED_PRODUCTS, ...READY_MIX_PRODUCTS, ...STEEL_PRODUCTS, ...MASONRY_PRODUCTS, ...ROOFING_PRODUCTS].map((p) => ({ url: `${SITE_URL}/products/${p.slug}` })),
    ...posts.map((p) => ({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: p.updatedAt })),
    ...vacancies.map((v) => ({ url: `${SITE_URL}/careers/${v.slug}`, lastModified: v.publishedAt ?? undefined })),
  ];
}
