# Payment Method Logo Assets — Provenance

Referenced by `apps/web/src/data/payment-methods.ts`'s `logoAssetPath` field.
Every path is relative to `apps/web/public/payment-logos/`. **As of this
build, every path in the table below resolves to a generated placeholder
SVG** — a dashed-border tile with the method's name lettered in, in brand
colour — not the real provider logo. This keeps the footer and payment tile
grid from showing broken images while the real assets are sourced. The real
image files are sourced and dropped in by Fortune separately, per the
confirmed workflow: *"I'll fetch everything on brandfetch."* Swapping a
placeholder for the real asset is a drop-in: keep the exact same filename
and path so `payment-methods.ts` doesn't need to change. This file exists so
whoever drops those files in knows exactly which provider each path belongs
to and where it should come from.

## Source libraries

1. **Roofsteel-shared zip** (`roofsteel-shared/`) — a payment-provider asset
   library originally built for the Roofsteel division and explicitly
   reused across Besbpo Group divisions, sourced via Manus. Covers most of
   the PayFast-aggregated methods.
2. **Brandfetch** (`brandfetch/`) — official brand assets fetched directly
   from each provider's brand page. Used for providers missing from, or
   with quality issues in, the Roofsteel zip.
3. **PayFast's own asset kit** (`payfast/`) — official PayFast-hosted logos
   for every method PayFast itself aggregates (card networks, EFT, wallets,
   QR, several BNPLs).
4. **Generic** (`generic/`) — a house-style icon for methods with no
   third-party brand asset to display (e.g. EFT/PO invoicing).

## Per-method provenance

| Method | Path | Source | Notes |
|---|---|---|---|
| Card (Visa/Mastercard/Amex) | `payfast/visa-mastercard-amex.svg` | PayFast kit | |
| Instant EFT | `payfast/instant-eft.svg` | PayFast kit | |
| Capitec Pay | `payfast/capitec-pay.svg` | PayFast kit | **Flagged**: the Roofsteel zip's Capitec Pay asset is dark-background-only (no light variant) — confirm the PayFast-kit version has both before using on a light card background. |
| Apple Pay | `payfast/apple-pay.svg` | PayFast kit | |
| Google Pay | `payfast/google-pay.svg` | PayFast kit | |
| Samsung Pay | `payfast/samsung-pay.svg` | PayFast kit | |
| SnapScan | `payfast/snapscan.svg` | PayFast kit | |
| Zapper | `brandfetch/zapper.svg` | Brandfetch | Not in the Roofsteel zip's original list — sourced by Fortune directly. |
| PayJustNow | `peach/payjustnow.svg` | Peach Payments' own asset kit | |
| Payflex | `payfast/payflex.svg` | PayFast kit | |
| Mobicred | `payfast/mobicred.svg` | PayFast kit | |
| MoreTyme | `payfast/moretyme.svg` | PayFast kit | |
| Happy Pay | `brandfetch/happy-pay.svg` | Brandfetch | Added to the payment lineup after the original Roofsteel zip was built — not in it by design. |
| Float | `brandfetch/float.svg` | Brandfetch | Superseded an earlier "Google AI search" image whose provenance couldn't be verified — Brandfetch is the confirmed, verifiable source. |
| Ozow | `roofsteel-shared/ozow.svg` | Roofsteel zip | **Flagged**: the zip's Ozow asset is PNG only (no SVG) per the original manifest — confirm an SVG exists before using at multiple sizes, or fall back to the PNG. |
| Stitch | `brandfetch/stitch.svg` | Brandfetch | Added after the original Roofsteel zip was built. |
| Lulapay | `brandfetch/lulapay.svg` | Brandfetch | AA's own B2B credit-facility strategy — not shared with Roofsteel. |
| EFT / Purchase Order | `generic/eft-po.svg` | House icon | No third-party brand — this is an internal payment path, not a provider. |

## Still open

- Confirm the Capitec Pay and Ozow flags above once the actual asset files
  land in `apps/web/public/payment-logos/` (this repo currently contains
  generated placeholder SVGs at every path, not the binary provider logos).
- Social media icons follow the same "dedicated Brandfetch zips" pattern —
  see `apps/web/src/data/social.ts`'s `iconAssetPath` field and
  `apps/web/public/social-icons/` (also currently generated placeholders —
  each a coloured tile with a one/two-letter platform glyph, not the real
  icon).
- Placeholder generator: `gen_placeholder_icons.py` (kept in the delivery
  scratch space, not the repo) — re-run it if a new payment method or
  social platform is added before the real Brandfetch assets are sourced,
  so nothing ever falls back to a broken `<img>`.
