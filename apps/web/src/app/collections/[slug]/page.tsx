import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionTracker } from "@/components/merchandising/SectionTracker";
import { ListingCard } from "@/components/product/ListingCard";
import { CompareTray } from "@/components/product/CompareTray";
import { getHiddenSkus } from "@/lib/cms";
import { getCollection, getMerchCatalogue, resolveCollection } from "@/lib/merchandising";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const c = await getCollection(params.slug);
  return c ? { title: c.title, description: c.subtitle ?? c.description ?? undefined, alternates: { canonical: `/collections/${c.slug}` } } : { title: "Collection" };
}

/** A staff collection's own page (ROADMAP 3.4, docs/merchandising.md): hand-picked products first, then the rule's matches. */
export default async function CollectionPage({ params }: { params: { slug: string } }) {
  const collection = await getCollection(params.slug);
  if (!collection) notFound();
  const { products, seeAll } = resolveCollection(collection, new Set(await getHiddenSkus()), 96, await getMerchCatalogue());

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / <Link href="/collections" className="hover:text-seam-blue">Collections</Link> / {collection.title}
      </nav>
      <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-seam-blue">Collection</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-basalt">{collection.title}</h1>
      {collection.subtitle && <p className="mt-1 max-w-3xl font-body text-base text-slate">{collection.subtitle}</p>}
      {collection.description && <p className="mt-3 max-w-3xl whitespace-pre-line font-body text-sm text-basalt">{collection.description}</p>}
      {products.length === 0 ? (
        <p className="mt-8 font-body text-sm text-slate">Nothing in this collection right now — <Link href="/products" className="text-seam-blue hover:underline">browse all products</Link>.</p>
      ) : (
        <SectionTracker slot={`collection:${collection.slug}:page`} className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <ListingCard key={p.sku} product={p} />
          ))}
        </SectionTracker>
      )}
      {seeAll && products.length >= 96 && (
        <Link href={seeAll} className="mt-6 inline-block font-body text-sm font-semibold text-seam-blue hover:underline">See every match, with filters →</Link>
      )}
      <CompareTray />
    </div>
  );
}
