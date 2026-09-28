import Link from "next/link";
import { createBlogCategory } from "@/app/account/actions";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { api } from "@/lib/api";
import { formatPostDate, type BlogPost } from "@/lib/blog";
import { sessionToken } from "@/lib/session";

export const metadata = { title: "Blog" };

export default async function AdminBlogPage() {
  const token = sessionToken();
  const [posts, categories] = await Promise.all([
    api<BlogPost[]>("/blog/admin/posts", { token }),
    api<{ slug: string; name: string }[]>("/blog/categories", { token }),
  ]);
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-body text-sm font-semibold text-basalt">Articles</h2>
          <Link href="/admin/blog/new" className="rounded-sm bg-seam-blue px-4 py-2 font-body text-sm font-semibold text-limestone hover:bg-basalt">
            Write an article
          </Link>
        </div>
        {!posts.ok ? (
          <p className="mt-4 font-body text-sm text-slate">{posts.message}</p>
        ) : posts.data.length === 0 ? (
          <p className="mt-4 font-body text-sm text-slate">No articles yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-basalt/5 rounded-sm border border-basalt/10 bg-white font-body text-sm">
            {posts.data.map((post) => (
              <li key={post.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
                <Link href={`/admin/blog/${post.id}`} className="font-semibold text-seam-blue hover:underline">{post.title}</Link>
                <span className="flex gap-3 font-mono text-[11px] text-slate">
                  {post.category && <span>{post.category.name}</span>}
                  <span className={post.isPublished ? "text-seam-blue" : "text-ochre-gold"}>
                    {post.isPublished ? `Published ${formatPostDate(post.publishedAt)}` : "Draft"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <aside className="rounded-sm border border-basalt/10 bg-white p-5">
        <h2 className="font-body text-sm font-semibold text-basalt">Categories</h2>
        <ul className="mt-2 font-body text-sm text-slate">
          {(categories.ok ? categories.data : []).map((c) => (
            <li key={c.slug}>{c.name}</li>
          ))}
        </ul>
        <ActionForm action={createBlogCategory} className="mt-4 space-y-3">
          <label className="block">
            <span className="font-mono text-[10px] uppercase text-slate">New category</span>
            <input name="name" required minLength={2} maxLength={60} className={inputClass} />
          </label>
          <SubmitButton variant="subtle">Add category</SubmitButton>
        </ActionForm>
      </aside>
    </div>
  );
}
