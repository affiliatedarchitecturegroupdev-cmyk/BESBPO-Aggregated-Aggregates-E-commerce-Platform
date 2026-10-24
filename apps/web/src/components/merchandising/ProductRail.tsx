import Link from "next/link";
import { ListingCard } from "@/components/product/ListingCard";
import type { IndexedProduct } from "@/lib/product-index";

/**
 * A titled row of product cards for the homepage and department pages (ROADMAP 3.1): Buy online / Quote badges,
 * quick add and compare on every card. Renders nothing when it has nothing to show.
 */
export function ProductRail({
  title,
  eyebrow,
  blurb,
  products,
  seeAll,
  seeAllLabel = "See all →",
  min = 1,
  tone = "light",
  bare = false,
}: {
  title: string;
  eyebrow?: string;
  blurb?: string;
  products: IndexedProduct[];
  seeAll?: string | null;
  seeAllLabel?: string;
  /** Hide the row below this many products. */
  min?: number;
  tone?: "light" | "tint";
  /** Inside a page that already has its own width and padding (department pages). */
  bare?: boolean;
}) {
  if (products.length < min) return null;
  return (
    <section className={bare ? "mt-14" : tone === "tint" ? "bg-white/60" : ""}>
      <div className={bare ? "" : "mx-auto max-w-6xl px-4 py-10"}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-3xl">
            {eyebrow && <p className="font-mono text-[10px] uppercase tracking-widest text-seam-blue">{eyebrow}</p>}
            <h2 className="mt-1 font-display text-2xl font-bold text-basalt">{title}</h2>
            {blurb && <p className="mt-1 font-body text-sm text-slate">{blurb}</p>}
          </div>
          {seeAll && (
            <Link href={seeAll} className="shrink-0 font-body text-sm font-semibold text-seam-blue hover:underline">
              {seeAllLabel}
            </Link>
          )}
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <ListingCard key={p.sku} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
