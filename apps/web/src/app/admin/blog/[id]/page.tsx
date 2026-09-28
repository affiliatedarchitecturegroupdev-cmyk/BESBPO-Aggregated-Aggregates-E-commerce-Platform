import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteBlogPost } from "@/app/account/actions";
import { BlogPostForm } from "@/components/admin/BlogPostForm";
import { api } from "@/lib/api";
import type { BlogPost } from "@/lib/blog";
import { sessionToken } from "@/lib/session";

export const metadata = { title: "Article" };

export default async function EditBlogPostPage({ params, searchParams }: { params: { id: string }; searchParams: { created?: string } }) {
  const token = sessionToken();
  const [post, categories] = await Promise.all([
    api<BlogPost>(`/blog/admin/posts/${encodeURIComponent(params.id)}`, { token }),
    api<{ slug: string; name: string }[]>("/blog/categories", { token }),
  ]);
  if (!post.ok) {
    if (post.status === 404) notFound();
    return <p className="font-body text-sm text-slate">{post.message}</p>;
  }
  return (
    <div className="max-w-3xl">
      <Link href="/admin/blog" className="font-mono text-xs text-slate hover:text-seam-blue">← Blog</Link>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-bold text-basalt">{post.data.title}</h2>
        {post.data.isPublished && (
          <Link href={`/blog/${post.data.slug}`} target="_blank" className="font-mono text-xs text-seam-blue hover:underline">
            View on site ↗
          </Link>
        )}
      </div>
      {searchParams.created && <p className="mt-3 rounded-sm border border-seam-blue/30 bg-seam-blue/5 p-3 font-body text-sm text-seam-blue">Article created.</p>}
      <div className="mt-4">
        <BlogPostForm post={post.data} categories={categories.ok ? categories.data : []} />
      </div>
      <form action={deleteBlogPost} className="mt-6">
        <input type="hidden" name="id" value={post.data.id} />
        <button className="rounded-sm border border-red-700/40 px-3 py-1.5 font-body text-xs font-semibold text-red-700 hover:bg-red-50">Delete article</button>
      </form>
    </div>
  );
}
