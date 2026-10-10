import Link from "next/link";
import { CATEGORIES } from "@/data/categories";
import { adminCatalogue, type AdminProduct } from "@/lib/admin-data";

const live = (p: AdminProduct) => p.images.filter((i) => i.licence === "CLEARED").length;
const pending = (p: AdminProduct) => p.images.filter((i) => i.licence === "PERMISSION_PENDING" && !i.licenceName).length;

export const metadata = { title: "Products" };

export default async function AdminProductsPage() {
  const catalogue = await adminCatalogue();
  if (!catalogue) return <p className="font-body text-sm text-slate">The catalogue couldn&apos;t be loaded — try again shortly.</p>;
  return (
    <div>
      <p className="font-body text-sm text-slate">
        Names, units and prices come from the pricing catalogues (aggregates, cement, ready-mix, steel, and masonry &amp; precast) and can only
        change there. Here you manage descriptions, photography, visibility and the homepage&apos;s Featured Materials: give a product a featured
        position and it shows in its line&apos;s tab (up to four a tab, lowest number first); a tab with none featured shows our default picks.
      </p>
      {CATEGORIES.map((category) => (
        <section key={category.slug} className="mt-6">
          <h2 className="font-body text-sm font-semibold text-basalt">{category.name}</h2>
          <ul className="mt-2 divide-y divide-basalt/5 rounded-sm border border-basalt/10 bg-white font-body text-sm">
            {catalogue
              .filter((p) => p.categorySlug === category.slug)
              .map((p) => (
                <li key={p.sku} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                  <Link href={`/admin/products/${p.sku}`} className="font-semibold text-seam-blue hover:underline">
                    {p.name}
                  </Link>
                  <span className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-slate">
                    <span>{p.sku}</span>
                    <span>{p.priceSummary.split(" · ")[0]}</span>
                    <span>
                      {live(p)} live photo{live(p) === 1 ? "" : "s"}
                      {pending(p) > 0 && <span className="text-ochre-gold"> · {pending(p)} awaiting permission</span>}
                    </span>
                    {p.featuredRank !== null && <span className="text-ochre-gold">Featured #{p.featuredRank}</span>}
                    <span className={p.isActive ? "text-seam-blue" : "text-red-700"}>{p.isActive ? "Visible" : "Hidden"}</span>
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
