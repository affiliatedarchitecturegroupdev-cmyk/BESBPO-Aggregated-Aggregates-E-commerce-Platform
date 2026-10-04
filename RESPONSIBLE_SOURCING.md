# Responsible Sourcing — badges

The `/responsible-sourcing` page and the homepage badge strip show the
regulatory, statutory and industry-association marks we expect our suppliers
(and the contractors we refer customers to) to hold. On the storefront these
marks are always called **badges**.

Built from the Manus prototype `AggregateTrust_Responsible_Sourcing_Source.zip`,
adapted to Aggregated Aggregates.

## Where things live

| What | File |
|---|---|
| Badge copy, colours, sources | `apps/web/src/data/badges.ts` |
| Badge files | `apps/web/public/badges/` |
| Full carousel (page) | `apps/web/src/components/sourcing/BadgeCarousel.tsx` |
| Compact carousel (homepage, links to the page) | `apps/web/src/components/sourcing/BadgeCarouselCompact.tsx` |
| Shared autoplay / keyboard / swipe logic | `apps/web/src/components/sourcing/useBadgeCarousel.ts` |
| Evidence register (search + filter) | `apps/web/src/components/sourcing/EvidenceRegister.tsx` |
| Page | `apps/web/src/app/responsible-sourcing/page.tsx` |

Carousel behaviour (as in the prototype): moves every ~6 s (5 s on the
homepage), stops when someone uses the arrows, tabs or keyboard (← → Home End),
swipes on touch, has a pause/play button, and never autoplays when the visitor
prefers reduced motion.

## How the badges are used

Decision by Besbpo Group: the badges are used openly as a **compliance and
educational** representation of what we expect from suppliers — part of our
due diligence — not as certifications we hold. Every badge is shown with:

- its scope (what the body actually covers),
- what we expect of suppliers in relation to it,
- a link to the body's own page,
- the page-wide disclosure that the marks belong to their bodies, aren't our
  certifications and don't imply endorsement.

Note: the prototype's manifest marks every logo `permission_required`. If a
body asks us to stop using its mark, or publishes brand-use rules we don't
meet, set that badge's `logo` to `null` — it then renders as a text tile.

## Badge files and provenance

Official source pages from the prototype's `AggregateTrust_Logo_Manifest.csv`.

| Badge | File | Source | Notes |
|---|---|---|---|
| ASPASA | `aspasa.png` | https://aspasa.co.za/ | Cropped to the mark |
| SABS / SANS | `sabs.png` | https://www.sabs.co.za/sabs-standards | As supplied |
| SANAS | — | https://www.sanas.co.za/ | **Missing.** The ZIP's `sanas_logo.png` is a "Chat with me" chatbot graphic, not the SANAS mark; a text tile shows until the official file is supplied |
| Concrete Society of Southern Africa | `concrete-society-sa.png` | https://concretesocietysa.org.za/ | Cropped to content |
| SARF | `sarf.jpg` | https://www.sarf.org.za/ | As supplied |
| NHBRC | `nhbrc.svg` | https://www.nhbrc.org.za/registration-process/ | White mark, shown on its navy shell (#234c70) |
| cidb | `cidb.svg` | https://www.cidb.org.za/contractors/ | White mark, shown on its teal shell (#126873) |
| B-BBEE Commission | `bbbee-commission.png` | https://www.bbbeecommission.co.za/ | Trimmed, 480 px |

## Claims never to make

- "SABS-approved supplier" or "SANS-certified Aggregated Aggregates".
- "ASPASA-certified aggregate" when the evidence is only membership.
- "SANAS-approved product" without the accredited lab/certifier and its scope.
- "SARF-approved G5" without the project specification and test evidence.
- "NHBRC-approved materials" or "cidb-approved cement".
- Using a supplier's or body's logo to imply authorised distribution without
  written confirmation.

Product-level evidence belongs in each product's Compliance Docs tab (from the
document register), never inferred from the badge carousel. The evidence
register on the page shows example record types, not live certificates.
