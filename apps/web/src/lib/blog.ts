import "server-only";
import { cache } from "react";
import { apiCached } from "./api";

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  bodyMarkdown: string;
  coverImageUrl: string | null;
  authorName: string;
  isPublished: boolean;
  publishedAt: string | null;
  updatedAt: string;
  category: { slug: string; name: string } | null;
};

/** Published posts, newest first. Empty when the API can't be reached. */
export const getPublishedPosts = cache(async () => (await apiCached<BlogPost[]>("/blog/posts")) ?? []);

export const getPublishedPost = cache((slug: string) => apiCached<BlogPost>(`/blog/posts/${encodeURIComponent(slug)}`));

export function formatPostDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
}
