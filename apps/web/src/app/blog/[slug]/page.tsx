import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownBody } from "@/components/blog/MarkdownBody";
import { SocialShareButtons } from "@/components/social/SocialShareButtons";
import { formatPostDate, getPublishedPost } from "@/lib/blog";
import { resolveImage } from "@/lib/promotions";
import { SITE_URL } from "@/lib/site";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPublishedPost(params.slug);
  if (!post) return { title: "Article not found" };
  const cover = resolveImage(post.coverImageUrl);
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: "article", publishedTime: post.publishedAt ?? undefined, ...(cover ? { images: [{ url: cover.src }] } : {}) },
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPublishedPost(params.slug);
  if (!post) notFound();
  const cover = resolveImage(post.coverImageUrl);
  const url = `${SITE_URL}/blog/${post.slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt ?? undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": "Organization", name: post.authorName },
    publisher: { "@type": "Organization", name: "Aggregated Aggregates" },
    articleSection: post.category?.name,
    ...(cover ? { image: cover.src } : {}),
    url,
  };
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / <Link href="/blog" className="hover:text-seam-blue">Blog</Link> / {post.title}
      </nav>
      {post.category && (
        <Link href={`/blog?category=${post.category.slug}`} className="mt-6 block font-mono text-[10px] uppercase tracking-widest text-seam-blue">
          {post.category.name}
        </Link>
      )}
      <h1 className="mt-1 font-display text-3xl font-bold text-basalt">{post.title}</h1>
      <p className="mt-2 font-mono text-[11px] text-slate">
        {formatPostDate(post.publishedAt)} · {post.authorName}
      </p>
      {cover && (
        <figure className="mt-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- licensed library or staff-supplied cover */}
          <img src={cover.src} alt={cover.alt ?? ""} referrerPolicy="no-referrer" className="h-64 w-full rounded-sm bg-basalt object-cover" />
          {cover.credit && <figcaption className="mt-1 font-mono text-[10px] text-slate">Photo: {cover.credit}</figcaption>}
        </figure>
      )}
      <div className="mt-4">
        <MarkdownBody markdown={post.bodyMarkdown} />
      </div>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-basalt/10 pt-6">
        <SocialShareButtons productName={post.title} productUrl={url} />
        <Link href="/blog" className="font-body text-sm text-seam-blue hover:underline">← All articles</Link>
      </div>
    </article>
  );
}
