import Link from "next/link";
import { ListingCard } from "@/components/product/ListingCard";
import { ProductRail } from "@/components/merchandising/ProductRail";
import { ProvinceTabs } from "@/components/merchandising/ProvinceTabs";
import { SectionTracker } from "@/components/merchandising/SectionTracker";
import {
  getBrands,
  getBuyOnlineToday,
  getCollections,
  getExpressProducts,
  getMerchCatalogue,
  getNewInStore,
  getSeasonal,
  getTopSellers,
  getTrendingProvinces,
  getUnderR500,
  MIN_ROW,
  resolveCollection,
} from "@/lib/merchandising";

/**
 * The homepage's product-led sections (ROADMAP 3.1, docs/merchandising.md), each fed by real data and hidden
 * when there's nothing real to show: staff collections, best sellers, buy online today, the season, new in store,
 * trending by province and shop by brand. AA 60/120 and under-R500 rows sit with the express band (HomeExpressRows).
 */
export async function HomeMerchandising({ hiddenSkus }: { hiddenSkus: string[] }) {
  const hidden = new Set(hiddenSkus);
  const [collections, bestSellers, newInStore, provinces, cat] = await Promise.all([getCollections("HOMEPAGE"), getTopSellers(hidden, { limit: 8 }), getNewInStore(hidden, 8), getTrendingProvinces(), getMerchCatalogue()]);
  const today = getBuyOnlineToday(hidden, new Date(), 8, cat);
  const seasonal = getSeasonal(hidden, new Date(), 8, cat);
  const trending = await Promise.all(provinces.slice(0, 4).map(async (p) => ({ province: p, products: await getTopSellers(hidden, { province: p, limit: 8 }) })));
  const trendingShown = trending.filter((t) => t.products.length >= MIN_ROW);
  const brands = getBrands(hidden);

  return (
    <>
      {collections.map((c) => {
        const { products } = resolveCollection(c, hidden, 8, cat);
        return <ProductRail key={c.slug} eyebrow="Collection" title={c.title} blurb={c.subtitle ?? undefined} products={products} seeAll={`/collections/${c.slug}`} seeAllLabel="See the collection →" track={`collection:${c.slug}:home`} />;
      })}
      <ProductRail eyebrow="Best sellers this month" title="What builders are buying" blurb="The products in the most paid orders over the last 30 days." products={bestSellers} min={MIN_ROW} track="home:best-sellers" />
      {today.department && (
        <ProductRail
          eyebrow="Buy online today"
          title={`${today.department.name}: priced and ready to order`}
          blurb="A different department each day — every one of these goes straight into the cart at a published price."
          products={today.products}
          seeAll={`/products?department=${today.department.slug}&availability=online`}
          seeAllLabel={`All buy-online ${today.department.shortName.toLowerCase()} →`}
          min={MIN_ROW}
          tone="tint"
          track="home:buy-online-today"
        />
      )}
      <ProductRail
        eyebrow="In season"
        title={seasonal.season.title}
        blurb={seasonal.season.blurb}
        products={seasonal.products}
        seeAll={seasonal.season.departments[0] ? `/products?department=${seasonal.season.departments[0]}` : null}
        min={MIN_ROW}
        track="home:seasonal"
      />
      <ProductRail eyebrow="New in store" title="Just added to the range" blurb="Recently added products and departments." products={newInStore} seeAll="/departments" seeAllLabel="All departments →" min={MIN_ROW} tone="tint" track="home:new-in-store" />
      {trendingShown.length > 0 && (
        <SectionTracker slot="home:trending">
        <section>
          <div className="mx-auto max-w-6xl px-4 py-10">
            <p className="font-mono text-[10px] uppercase tracking-widest text-seam-blue">Trending in your province</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-basalt">What&apos;s selling near you</h2>
            <div className="mt-4">
              <ProvinceTabs
                provinces={trendingShown.map((t) => t.province)}
                panels={trendingShown.map((t) => (
                  <div key={t.province} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {t.products.map((p) => (
                      <ListingCard key={p.sku} product={p} />
                    ))}
                  </div>
                ))}
              />
            </div>
          </div>
        </section>
        </SectionTracker>
      )}
      {brands.length >= MIN_ROW && (
        <SectionTracker slot="home:brands">
        <section className="mx-auto max-w-6xl px-4 py-10">
          <p className="font-mono text-[10px] uppercase tracking-widest text-seam-blue">Shop by brand</p>
          <h2 className="mt-1 font-display text-2xl font-bold text-basalt">The makers builders ask for</h2>
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {brands.map((b) => (
              <li key={b.brand}>
                <Link href={`/products?brand=${encodeURIComponent(b.brand)}`} className="flex h-full flex-col justify-between rounded-sm border border-basalt/10 bg-white p-4 hover:border-seam-blue">
                  <span className="font-display text-base font-semibold text-basalt">{b.brand}</span>
                  <span className="mt-2 font-mono text-[10px] uppercase text-slate">{b.count} products →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        </SectionTracker>
      )}
    </>
  );
}

/** Next to the AA 60/120 band: what can come in two hours, and the site essentials under R500. */
export async function HomeExpressRows({ hiddenSkus }: { hiddenSkus: string[] }) {
  const hidden = new Set(hiddenSkus);
  const cat = await getMerchCatalogue();
  return (
    <>
      <ProductRail
        eyebrow="Delivered in 120 minutes"
        title="Order by 15:00, on site in two hours"
        blurb="These qualify for AA 60/120 express delivery within 30 km of a partner supplier — the checkout confirms your address."
        products={getExpressProducts(hidden, 8, cat)}
        seeAll="/aa-60-120"
        seeAllLabel="How AA 60/120 works →"
        min={MIN_ROW}
        track="home:express"
      />
      <ProductRail
        eyebrow="Site essentials under R500"
        title="The small things every site runs out of"
        blurb="Tie wire, fixings, sealants, PPE and tools — add them to the load you're already ordering."
        products={getUnderR500(hidden, 8, cat)}
        seeAll="/products?availability=online&sort=price-asc"
        seeAllLabel="All buy-online products, cheapest first →"
        min={MIN_ROW}
        tone="tint"
        track="home:under-r500"
      />
    </>
  );
}
