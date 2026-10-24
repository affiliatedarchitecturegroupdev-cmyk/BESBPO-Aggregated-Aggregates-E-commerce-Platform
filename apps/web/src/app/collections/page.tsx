import type { Metadata } from "next";
import Link from "next/link";
import { getCollections } from "@/lib/merchandising";

export const metadata: Metadata = { title: "Collections", description: "Curated product collections for the job in hand.", alternates: { canonical: "/collections" } };

/** Every live staff collection (ROADMAP 3.4). */
export default async function CollectionsPage() {
  const collections = await getCollections("");
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / Collections
      </nav>
      <h1 className="mt-3 font-display text-3xl font-bold text-basalt">Collections</h1>
      {collections.length === 0 ? (
        <p className="mt-6 font-body text-sm text-slate">
          No collections are running right now. <Link href="/departments" className="text-seam-blue hover:underline">Shop by department</Link> instead.
        </p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <li key={c.slug}>
              <Link href={`/collections/${c.slug}`} className="block h-full rounded-sm border border-basalt/10 bg-white p-5 hover:border-seam-blue">
                <h2 className="font-display text-lg font-semibold text-basalt">{c.title}</h2>
                {c.subtitle && <p className="mt-1 font-body text-sm text-slate">{c.subtitle}</p>}
                <p className="mt-3 font-mono text-[10px] uppercase text-seam-blue">See the collection →</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
