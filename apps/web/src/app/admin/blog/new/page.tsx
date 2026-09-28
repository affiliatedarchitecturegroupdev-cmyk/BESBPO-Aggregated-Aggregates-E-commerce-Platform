import Link from "next/link";
import { BlogPostForm } from "@/components/admin/BlogPostForm";
import { api } from "@/lib/api";
import { sessionToken } from "@/lib/session";

export const metadata = { title: "Write an article" };

export default async function NewBlogPostPage() {
  const categories = await api<{ slug: string; name: string }[]>("/blog/categories", { token: sessionToken() });
  return (
    <div className="max-w-3xl">
      <Link href="/admin/blog" className="font-mono text-xs text-slate hover:text-seam-blue">← Blog</Link>
      <h2 className="mt-2 font-display text-xl font-bold text-basalt">Write an article</h2>
      <div className="mt-4">
        <BlogPostForm categories={categories.ok ? categories.data : []} />
      </div>
    </div>
  );
}
