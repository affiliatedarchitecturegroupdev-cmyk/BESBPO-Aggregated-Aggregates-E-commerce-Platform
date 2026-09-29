# Payment Method Logo Assets — Provenance

Referenced by `apps/web/src/data/payment-methods.ts`'s `logoAssetPath` field
(plus `extraLogoPaths` for Card, which shows three networks). Every path is
relative to `apps/web/public/payment-logos/`, and every logo is drawn by
`components/payment/PaymentLogo.tsx` on a white badge — so dark or black
official marks read the same on the dark footer as on white cards.

**Status (Sep 2026):** 15 of the 18 methods use official logo files. Float,
Lulapay and EFT / Purchase Order are still generated placeholders — a dashed
tile with the method name — until their files are found.

"Frame tightened" means only the SVG's viewBox/size was changed to remove
empty margin, so the logo fills its badge; no shapes or colours were edited.

Swapping a placeholder for a real file: drop it in the folder for its source,
point the method's `logoAssetPath` at it, delete the placeholder, and update
the table below.

## Source libraries

1. **PayFast Payment Methods Logo Pack** (`payfast/`) — the logo pack PayFast
   publishes for merchants, supplied by Fortune (Sep 2026). Preferred source:
   it has the product marks ("Apple Pay", "G Pay", "Capitec Pay"…) rather than
   the parent brands. Files are used as supplied except where noted below.
2. **Brandfetch** (`brandfetch/`) — official brand assets from each provider's
   Brandfetch page, supplied by Fortune (Sep 2026). Used where the PayFast pack
   has no file.
3. **Generic** (`generic/`) — a house-style icon for methods with no
   third-party brand (EFT / Purchase Order).

## Per-method provenance

| Method | Path | Source | Notes |
|---|---|---|---|
| Card (Visa / Mastercard / Amex) | `payfast/visa.svg`, `payfast/mastercard.svg`, `payfast/amex.svg` | PayFast pack | Three marks in one badge |
| Instant EFT | `payfast/instant-eft.svg` | PayFast pack | "instantEFT by payfast" |
| Capitec Pay | `payfast/capitec-pay.svg` | PayFast pack | Colour version; frame (viewBox) tightened to the artwork — the file was 45% empty margin |
| Apple Pay | `payfast/apple-pay.png` | PayFast pack | Pack has PNG only; scaled from 2560×1050 to 390×160 for the web (46KB → 11KB), not otherwise changed |
| Google Pay | `payfast/google-pay.svg` | PayFast pack | "G Pay" mark |
| Samsung Pay | `payfast/samsung-pay.png` | PayFast pack | Pack has PNG only; used as supplied |
| SnapScan | `payfast/snapscan.svg` | PayFast pack | Frame tightened to the artwork (30% margin). Replaces the Brandfetch file, which turned out to be an Apple-style icon, not SnapScan's mark |
| Zapper | `payfast/zapper.svg` | PayFast pack | SVG replaces the earlier Brandfetch PNG |
| PayJustNow | `brandfetch/payjustnow.svg` | Brandfetch | Not in the PayFast pack |
| Payflex | `payfast/payflex.svg` | PayFast pack | Shown at full badge height (`logoFill`). The pack's "vectorised" SVG had a full-page grey background rectangle; that one shape was removed and the frame fitted to the badge. Artwork unchanged |
| Mobicred | `payfast/mobicred.svg` | PayFast pack | SVG replaces the earlier small white Brandfetch PNG |
| MoreTyme | `payfast/moretyme.png` | PayFast pack | Shown at full badge height (`logoFill`). The pack's files are a small logo centred on a 4000×4000 white square (the SVG only wraps that bitmap); trimmed to the logo and scaled to 160px tall (205KB → 20KB). Artwork unchanged |
| Happy Pay | `brandfetch/happy-pay.svg` | Brandfetch | Not in the PayFast pack; frame tightened to the artwork |
| Float | `brandfetch/float.svg` | — | **Placeholder** |
| Ozow | `brandfetch/ozow.svg` | Brandfetch | Not in the PayFast pack |
| Stitch | `brandfetch/stitch.svg` | Brandfetch | The Brandfetch file had a broken root tag (viewBox lost) and an undefined CSS-variable fill; both repaired, artwork unchanged |
| Lulapay | `brandfetch/lulapay.svg` | — | **Placeholder** — AA's own B2B credit-facility strategy |
| EFT / Purchase Order | `generic/eft-po.svg` | House icon | **Placeholder** — no third-party brand |

The PayFast pack also has logos for methods the platform doesn't offer
(Absa Pay, Diners Club, Maestro, MTN MoMoPay, Mukuru, PayPal, RCS, SCode,
Scan to Pay, SiD, Visa Electron, Visa Checkout, 3-D Secure badges). They are
not copied into the repo; add them from the pack if those methods are enabled.

## Still open

- Official files still to source: Float and Lulapay, and a house EFT / PO icon.
- Social media icons follow the same pattern — see `apps/web/src/data/social.ts`'s
  `iconAssetPath` field and `apps/web/public/social-icons/` (still generated
  placeholders).
