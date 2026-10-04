import type { MetadataRoute } from "next";
import { PRODUCTS } from "@/data/catalogue";
import { CATEGORIES } from "@/data/categories";
import { INDUSTRIES } from "@/data/industries";
import { PACKAGED_PRODUCTS } from "@/data/packaged";
import { getPublishedPosts } from "@/lib/blog";
import { getOpenVacancies } from "@/lib/careers";
import { SITE_URL } from "@/lib/site";

const STATIC_PATHS = [
  "",
  "/products",
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
  "/legal/popia-notice",
  "/legal/cookie-policy",
  "/legal/returns-refunds",
  "/legal/shipping-delivery",
  "/legal/paia-manual",
  "/photo-credits",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, vacancies] = await Promise.all([getPublishedPosts(), getOpenVacancies()]);
  return [
    ...STATIC_PATHS.map((path) => ({ url: `${SITE_URL}${path}` })),
    ...CATEGORIES.map((c) => ({ url: `${SITE_URL}/products?category=${c.slug}` })),
    ...INDUSTRIES.map((i) => ({ url: `${SITE_URL}/products?industry=${i.slug}` })),
    ...[...PRODUCTS, ...PACKAGED_PRODUCTS].map((p) => ({ url: `${SITE_URL}/products/${p.slug}` })),
    ...posts.map((p) => ({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: p.updatedAt })),
    ...vacancies.map((v) => ({ url: `${SITE_URL}/careers/${v.slug}`, lastModified: v.publishedAt ?? undefined })),
  ];
}
