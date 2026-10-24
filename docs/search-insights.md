# Search & merchandising insights

ROADMAP 2.0.2–2.0.3 (catalogue gaps) and Phase 3/4 follow-ups. Admin → **Insights → Search & gaps**, plus a
**Merchandising sections** table on Insights → Marketing.

Everything here is a **count**. Nothing records who searched, viewed or clicked.

## What is counted

| Signal | Where it comes from | Stored as |
|---|---|---|
| Searches | `/products?q=` (first page, no filters, sort or view change) and `/search?q=`, logged by the web server (`lib/search-insights.ts` → `POST /discovery/searches`) | `SearchQueryStat` — per South African day and normalised query: searches, searches that found nothing, the latest result count |
| Searches that found nothing | the same | also a `CatalogueGap` (source `SEARCH`) |
| Unmatched BOQ lines | `BoqService.submit()` after the quote request is created | `CatalogueGap` (source `BOQ`), with the latest quote request id |
| Merchandising sections | `SectionTracker` around homepage rails, department top sellers and collections → `/api/section-events` → `POST /discovery/sections` | `MerchandisingStat` — per day and section: views, clicks |

Not counted:
- header suggestions (each keystroke);
- link prefetches (`Next-Router-Prefetch`);
- crawlers, link previews, headless browsers and uptime monitors (user-agent filter);
- any search or BOQ line that looks like an email address, phone or ID number (seven or more digits) or a web address (`apps/api/src/discovery/discovery.ts`).

Queries are normalised before counting:
- lower case;
- single spaces;
- letters, digits and size characters only;
- at most 80 characters (120 for BOQ lines).

A section **view** is a third of the section on screen, once per browser session. A **click** is following a link inside it.

### Section names

| Name | Section |
|---|---|
| `home:best-sellers`, `home:buy-online-today`, `home:seasonal`, `home:new-in-store`, `home:trending`, `home:brands`, `home:express`, `home:under-r500` | Homepage sections |
| `department:<slug>:top-sellers` | Top sellers on a department page |
| `collection:<slug>:home`, `collection:<slug>:department-<dept>`, `collection:<slug>:page` | A collection: on the homepage, on a department page, or on its own page |

The API accepts only names of this shape (`SECTION_SLOT`). Add a section by passing `track="…"` to `ProductRail`, or by wrapping it in `SectionTracker`.

## Catalogue gaps

The list is sorted by most often asked for. Each gap is **Open**, **Added** or **Ignored**, and staff can add a note.

- **Added** means the product is now in the catalogue. If the same search or BOQ line keeps coming back unmatched, the gap opens again: the product is there, but customers still can't find it, so a synonym is probably needed.
- **Ignored** gaps stay ignored and keep counting.

## Synonyms

Staff synonym groups are stored in `SearchSynonym`. They are merged with the built-in groups in `lib/search-engine.ts` (`SYNONYMS`).

- The storefront reads them from `GET /discovery/synonyms`, cached for five minutes. Saving a group revalidates the `synonyms` tag, so the change applies at once.
- The search index is rebuilt only when the groups change (`catalogueIndex()` in `lib/product-index.ts`).
- Rules: 2–12 words or phrases per group. Duplicates are merged. Email addresses, links and long numbers are refused.

## API

| Method | Path | Who |
|---|---|---|
| POST | `/discovery/searches` `{query, results}` | public (the web server) |
| POST | `/discovery/sections` `{slot, type: impression\|click}` | public (via `/api/section-events`) |
| GET | `/discovery/synonyms` | public |
| GET | `/discovery/gaps?status=&source=&limit=` · `/discovery/gaps/counts` | staff |
| PUT | `/discovery/gaps/:id` `{status, note}` | staff |
| GET/POST/PUT/DELETE | `/discovery/staff/synonyms[/:id]` | staff |
| GET | `/insights/search?from=&to=` | staff — totals, daily series, top 50 searches, top 50 with no results |
| GET | `/insights/marketing` | staff — now includes `sections` |

## Still open

- RFQs and sales-quotation "other" lines feeding the gaps list (ROADMAP 2.0.5).
- Click-through from search results to products (needs browser analytics, Phase 5 Matomo).
