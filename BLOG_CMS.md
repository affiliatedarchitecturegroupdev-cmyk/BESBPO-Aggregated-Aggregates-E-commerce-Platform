# Blog & CMS

## What's built

| Piece | Where |
|---|---|
| Data model | `BlogCategory`, `BlogPost` (Markdown body, cover image, publish state) in `schema.prisma` |
| API | `apps/api/src/blog/` |
| Storefront | `/blog` (with category filter), `/blog/[slug]` (BlogPosting JSON-LD, share buttons), articles in site search and the sitemap |
| Admin | `/admin/blog` — list, write, edit, publish/unpublish, delete, add categories |
| Starter content | 3 articles and 2 categories, created once by the seed (then owned by the admin) |

## API

| Method | Route | Access |
|---|---|---|
| GET | `/api/v1/blog/posts` | Public — published posts only, newest first |
| GET | `/api/v1/blog/posts/:slug` | Public — 404 for drafts |
| GET | `/api/v1/blog/categories` | Public |
| POST | `/api/v1/blog/categories` | Staff/Admin |
| GET | `/api/v1/blog/admin/posts`, `/api/v1/blog/admin/posts/:id` | Staff/Admin — drafts included |
| POST / PUT / DELETE | `/api/v1/blog/admin/posts[/:id]` | Staff/Admin |

Write routes sit behind the platform's global auth guard with
`@Roles("STAFF", "ADMIN")` — the auth gap the delivered build flagged is
closed. Slugs are validated (`lowercase-words-with-hyphens`) and unique.

## Content rules

- Bodies are Markdown. Raw HTML is **not** rendered (react-markdown's
  default), so a post can't inject script; unsafe link protocols are
  stripped.
- Cover images are a media-library photo (`media:<id>`, see
  `apps/web/src/data/media.ts`) or an https image URL.
- The first publication stamps `publishedAt`; unpublishing keeps it, so
  republishing doesn't reorder the archive.
- Pages revalidate within a minute of a save.

## Other CMS surfaces

Site content (announcement bar, hero, homepage slideshow, trade promo),
product merchandising (descriptions, photos, visibility, featured row) and
promotions (the ad system's four slots) are all under `/admin`.
