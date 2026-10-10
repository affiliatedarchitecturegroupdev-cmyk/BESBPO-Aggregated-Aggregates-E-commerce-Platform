import Link from "next/link";
import { CategoryCarousel, type CategoryCard, type CategoryPage } from "@/components/merchandising/CategoryCarousel";
import { CORE_CATEGORIES, CATEGORIES } from "@/data/categories";
import { PLANT, SERVICES } from "@/data/plant-services";
import { QUOTABLE } from "@/data/quotable";
import { getCatalogue } from "@/lib/cms";
import { formatZAR } from "@/lib/pricing";

/** Everything sold by the product rather than by the ton: cement, ready-mix and steel, in the order of the menu. */
const MORE_CATEGORIES = CATEGORIES.filter((c) => c.catalogueGroup !== "core");

/**
 * Shop by Category: nine cards a page. Page one is the nine aggregate
 * categories; page two the rest of the range — cement, ready-mix, steel,
 * plant hire and site services.
 */
export async function CategoryGrid() {
  const catalogue = await getCatalogue();

  const aggregates: CategoryCard[] = CORE_CATEGORIES.map((category) => {
    const products = catalogue.filter((p) => p.categorySlug === category.slug);
    const perTon = products.map((p) => p.prices.RETAIL.ton).filter((price): price is number => price !== undefined);
    const from = perTon.length > 0 ? Math.min(...perTon) : null;
    return {
      key: category.slug,
      href: `/products?category=${category.slug}`,
      name: category.name,
      description: category.description,
      meta: `${products.length} products${from !== null ? ` · from ${formatZAR(from)}/ton` : ""}`,
    };
  });

  const more: CategoryCard[] = [
    ...MORE_CATEGORIES.map((category) => {
      const products = QUOTABLE.filter((p) => p.categorySlug === category.slug);
      // The cheapest live-priced unit in the category, with its unit — a bag, a length or a cubic metre.
      const cheapest = products
        .flatMap((p) => p.units)
        .filter((u) => u.retailPrice !== null)
        .sort((a, b) => a.retailPrice! - b.retailPrice!)[0];
      return {
        key: category.slug,
        href: `/products?category=${category.slug}`,
        name: category.name,
        description: category.description,
        meta: `${products.length} products${cheapest ? ` · from ${formatZAR(cheapest.retailPrice!)}/${cheapest.label.replace(/\s*\(.*\)$/, "")}` : " · on quote"}`,
      };
    }),
    {
      key: "plant-hire",
      href: "/plant-hire",
      name: "Plant Hire",
      description: "TLBs, excavators, tippers, rollers, skid steers, loaders, dumpers and water trucks — with operators, from vetted local partners.",
      meta: `${PLANT.length} machines · quoted per job`,
    },
    {
      key: "site-services",
      href: "/services",
      name: "Site Services",
      description: "Haulage, rubble removal, skip bins, site clearing, demolition, waste management and steel fixing.",
      meta: `${SERVICES.length} services · quoted per job`,
    },
  ];

  const pages: CategoryPage[] = [
    { label: "Aggregates", summary: "Nine aggregate categories, from sub-base to decorative — every price straight from our published pricing framework.", cards: aggregates },
    { label: "Cement, concrete, steel & hire", summary: "Cement, ready-mix, reinforcing and structural steel, plus plant hire and site services for the same job.", cards: more },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-2xl font-bold text-basalt">Shop by Category</h2>
        <Link href="/products" className="shrink-0 font-body text-sm text-seam-blue hover:underline">
          All products →
        </Link>
      </div>
      <CategoryCarousel pages={pages} total={aggregates.length + more.length} />
    </section>
  );
}
