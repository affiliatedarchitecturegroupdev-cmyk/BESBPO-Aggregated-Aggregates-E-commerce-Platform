import type { Metadata } from "next";
import Link from "next/link";
import { formatPostDate, getPublishedPosts } from "@/lib/blog";
import { resolveImage } from "@/lib/promotions";

export const metadata: Metadata = {
  title: "Blog",
  description: "Buying guides, technical notes on grading standards, and news from Aggregated Aggregates.",
  alternates: { canonical: "/blog" },
};

export default async function BlogIndexPage({ searchParams }: { searchParams: { category?: string } }) {
  const posts = await getPublishedPosts();
  const categories = [...new Map(posts.flatMap((p) => (p.category ? [[p.category.slug, p.category.name] as const] : []))).entries()];
  const shown = searchParams.category ? posts.filter((p) => p.category?.slug === searchParams.category) : posts;
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / Blog
      </nav>
      <h1 className="mt-4 font-display text-3xl font-bold text-basalt">Blog</h1>
      <p className="mt-2 font-body text-sm text-slate">Buying guides, technical notes, and what&apos;s new at Aggregated Aggregates.</p>
      {categories.length > 1 && (
        <div className="mt-6 flex flex-wrap gap-2 font-mono text-[11px]">
          <Link href="/blog" className={`rounded-sm px-2.5 py-1 ${!searchParams.category ? "bg-basalt text-limestone" : "bg-white text-slate"}`}>All</Link>
          {categories.map(([slug, name]) => (
            <Link key={slug} href={`/blog?category=${slug}`} className={`rounded-sm px-2.5 py-1 ${searchParams.category === slug ? "bg-basalt text-limestone" : "bg-white text-slate"}`}>
              {name}
            </Link>
          ))}
        </div>
      )}
      {shown.length === 0 ? (
        <p className="mt-10 font-body text-sm text-slate">No articles yet — check back soon.</p>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {shown.map((post) => {
            const cover = resolveImage(post.coverImageUrl);
            return (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group overflow-hidden rounded-sm border border-basalt/10 bg-white transition hover:border-seam-blue">
                {cover && (
                  // eslint-disable-next-line @next/next/no-img-element -- licensed library or staff-supplied cover
                  <img src={cover.src} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-44 w-full bg-basalt object-cover" />
                )}
                <div className="p-6">
                  {post.category && <span className="font-mono text-[10px] uppercase tracking-widest text-seam-blue">{post.category.name}</span>}
                  <h2 className="mt-1 font-display text-lg font-bold text-basalt group-hover:text-seam-blue">{post.title}</h2>
                  {post.excerpt && <p className="mt-2 font-body text-sm text-slate">{post.excerpt}</p>}
                  <p className="mt-3 font-mono text-[10px] text-slate">{formatPostDate(post.publishedAt)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
