# Payment Method Logo Assets — Provenance

Referenced by `apps/web/src/data/payment-methods.ts`'s `logoAssetPath` field.
Every path is relative to `apps/web/public/payment-logos/`, and every logo is
drawn by `components/payment/PaymentLogo.tsx` on a white badge — so dark or
black official marks read the same on the dark footer as on white cards.

**Status (Sep 2026):** 11 methods now use the official Brandfetch files
Fortune supplied (in `brandfetch/`). The rest are still generated placeholder
SVGs — a dashed tile with the method name — until their files are found.
Swapping a placeholder for a real file: drop it in `brandfetch/`, point the
method's `logoAssetPath` at it, delete the placeholder, and update the table.

Apple, Google, Samsung and Capitec are the parent-brand marks (Brandfetch
has no separate "Pay" files for them); `logoLabel: "Pay"` sets the word
"Pay" beside the mark, the way those wallets present themselves. SnapScan's
Brandfetch file is the icon only, so its badge adds the name the same way.

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

| Method | Path | Source | Status |
|---|---|---|---|
| Card (Visa/Mastercard/Amex) | `payfast/visa-mastercard-amex.svg` | PayFast kit | Placeholder |
| Instant EFT | `payfast/instant-eft.svg` | PayFast kit | Placeholder |
| Capitec Pay | `brandfetch/capitec.svg` + "Pay" | Brandfetch (Capitec Bank logo) | **Official** — parent-brand mark |
| Apple Pay | `brandfetch/apple.svg` + "Pay" | Brandfetch (Apple logo) | **Official** — parent-brand mark |
| Google Pay | `brandfetch/google-g.svg` + "Pay" | Brandfetch (Google "G" symbol) | **Official** — parent-brand mark |
| Samsung Pay | `brandfetch/samsung.svg` + "Pay" | Brandfetch (Samsung wordmark) | **Official** — parent-brand mark |
| SnapScan | `brandfetch/snapscan.svg` + "SnapScan" | Brandfetch (icon) | **Official** — icon only, name set beside it |
| Zapper | `brandfetch/zapper.png` | Brandfetch | **Official** — PNG only (217×59); swap for an SVG if one turns up |
| PayJustNow | `brandfetch/payjustnow.svg` | Brandfetch | **Official** |
| Payflex | `payfast/payflex.svg` | PayFast kit | Placeholder |
| Mobicred | `brandfetch/mobicred.png` | Brandfetch | **Official** — small white PNG (152×30), so `logoOnDark` gives it a dark badge; swap for a larger/SVG file if one turns up |
| MoreTyme | `payfast/moretyme.svg` | PayFast kit | Placeholder |
| Happy Pay | `brandfetch/happy-pay.svg` | Brandfetch | **Official** |
| Float | `brandfetch/float.svg` | Brandfetch | Placeholder |
| Ozow | `brandfetch/ozow.svg` | Brandfetch | **Official** — SVG, resolves the earlier PNG-only flag |
| Stitch | `brandfetch/stitch.svg` | Brandfetch | **Official** — the Brandfetch file had a broken root tag (viewBox lost) and an undefined CSS-variable fill; both repaired, artwork unchanged |
| Lulapay | `brandfetch/lulapay.svg` | Brandfetch | Placeholder |
| EFT / Purchase Order | `generic/eft-po.svg` | House icon | Placeholder — no third-party brand |

## Still open

- Official files still to source: Card (Visa/Mastercard/Amex), Instant EFT,
  Payflex, MoreTyme, Float, Lulapay, and a house EFT/PO icon.
- Dedicated "Apple Pay" / "Google Pay" / "Samsung Pay" / "Capitec Pay" marks,
  if found, replace the parent-brand mark + "Pay" label (drop `logoLabel`).
- Social media icons follow the same pattern — see `apps/web/src/data/social.ts`'s
  `iconAssetPath` field and `apps/web/public/social-icons/` (still generated
  placeholders).
