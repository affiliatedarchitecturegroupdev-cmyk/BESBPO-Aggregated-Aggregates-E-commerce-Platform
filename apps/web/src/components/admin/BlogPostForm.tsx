import { saveBlogPost } from "@/app/account/actions";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { HERO_SLIDESHOW_IMAGES } from "@/data/media";
import type { BlogPost } from "@/lib/blog";

const label = "font-mono text-[10px] uppercase text-slate";

/** Write or edit an article. The body is Markdown; raw HTML isn't rendered on the site. */
export function BlogPostForm({ post, categories }: { post?: BlogPost; categories: { slug: string; name: string }[] }) {
  return (
    <ActionForm action={saveBlogPost} className="space-y-4 rounded-sm border border-basalt/10 bg-white p-5">
      {post && <input type="hidden" name="id" value={post.id} />}
      <datalist id="blog-media">
        {HERO_SLIDESHOW_IMAGES.map((img) => (
          <option key={img.id} value={`media:${img.id}`}>{img.alt}</option>
        ))}
      </datalist>
      <label className="block">
        <span className={label}>Title *</span>
        <input name="title" required minLength={3} maxLength={140} defaultValue={post?.title} className={inputClass} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={label}>URL slug * (lowercase-words-with-hyphens)</span>
          <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={100} defaultValue={post?.slug} className={inputClass} />
        </label>
        <label className="block">
          <span className={label}>Category</span>
          <select name="categorySlug" defaultValue={post?.category?.slug ?? ""} className={inputClass}>
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className={label}>Excerpt (listing and search results)</span>
        <textarea name="excerpt" rows={2} maxLength={300} defaultValue={post?.excerpt ?? ""} className={inputClass} />
      </label>
      <label className="block">
        <span className={label}>Body * (Markdown: ## heading, **bold**, - list, [link](/products))</span>
        <textarea name="bodyMarkdown" required minLength={20} rows={16} defaultValue={post?.bodyMarkdown} className={`${inputClass} font-mono text-xs`} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Cover image — library photo or https URL</span>
          <input name="coverImageUrl" list="blog-media" defaultValue={post?.coverImageUrl ?? ""} placeholder="media:gravel-surface" className={inputClass} />
        </label>
        <label className="block">
          <span className={label}>Author</span>
          <input name="authorName" maxLength={80} defaultValue={post?.authorName ?? "Aggregated Aggregates"} className={inputClass} />
        </label>
      </div>
      <label className="flex items-center gap-2 font-body text-sm text-basalt">
        <input type="checkbox" name="isPublished" defaultChecked={post?.isPublished ?? false} className="h-4 w-4" />
        Published — visible on the blog
      </label>
      <SubmitButton>{post ? "Save" : "Create article"}</SubmitButton>
    </ActionForm>
  );
}
