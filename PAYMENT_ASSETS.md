# Payment Method Logo Assets — Provenance

Referenced by `apps/web/src/data/payment-methods.ts`'s `logoAssetPath` field
(plus `extraLogoPaths` for Card, which shows three networks). Every path is
relative to `apps/web/public/payment-logos/`, and every logo is drawn by
`components/payment/PaymentLogo.tsx` on a white badge — so dark or black
official marks read the same on the dark footer as on white cards.

**Status (Oct 2026):** 16 of the 18 methods use official logo files. Float
and EFT / Purchase Order are still generated placeholders — a dashed tile
with the method name — until their files are found.

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
3. **Lula** (`lula/`) — Lula's brand pack, supplied by Fortune (Oct 2026).
4. **Generic** (`generic/`) — a house-style icon for methods with no
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
| Lulapay | `lula/lula.png` | Lula pack | The pack has the symbol only (no wordmark). Cropped from the 1098px square to the mark, white made transparent, scaled to 160px tall. Artwork unchanged |
| EFT / Purchase Order | `generic/eft-po.svg` | House icon | **Placeholder** — no third-party brand |

The PayFast pack also has logos for methods the platform doesn't offer
(Absa Pay, Diners Club, Maestro, MTN MoMoPay, Mukuru, PayPal, RCS, SCode,
Scan to Pay, SiD, Visa Electron, Visa Checkout, 3-D Secure badges). They are
not copied into the repo; add them from the pack if those methods are enabled.

## Still open

- Official files still to source: Float, and a house EFT / PO icon.

## Social icons

`apps/web/public/social-icons/`, referenced by `apps/web/src/data/social.ts`.
From the brand packs Fortune supplied (Oct 2026). The symbol (icon), not the
wordmark, is used in every case, in the version that reads on the dark
footer. Files are used as supplied unless noted.

| Platform | File | Pack file | Notes |
|---|---|---|---|
| Facebook | `facebook.png` | `Facebook_Symbol_0.png` | Blue "f" circle; pack has PNG only — trimmed and scaled to 128px |
| Instagram | `instagram.svg` | `Instagram_Symbol_1.svg` | Gradient glyph tile |
| X | `x.svg` | `X_idVRwaKp9b_3.svg` | White X for the dark footer |
| TikTok | `tiktok.svg` | `TikTok_Symbol_27.svg` | White note with cyan/red offset |
| WhatsApp | `whatsapp.svg` | `WhatsApp_idCBBZAMfN_2.svg` | Green glyph |
| LinkedIn | `linkedin.svg` | `LinkedIn_Symbol_9.svg` | Placeholder handle — not shown until live |
| YouTube | `youtube.svg` | `YouTube_Symbol_9.svg` | Live — youtube.com/@BesbpoGroup |
| Behance | `behance.svg` | `Behance_id8HQT_mlw_4.svg` | Live — behance.net/besbpogroup |

Threads (listed in the earlier handles reference) had no pack, so it's not
shown. Add `threads.svg` and an entry in `social.ts` if it's still in use.

## Sign-in logos

`apps/web/public/sign-in-logos/`, used by the sign-in buttons
(`components/account/SocialSignIn.tsx`). Following each provider's button
convention, the buttons show the logo with the wordmark where the pack has one.

| Provider | Files | Notes |
|---|---|---|
| Google | `google-symbol.svg` + `google-wordmark.svg` | `Google_Symbol_3.svg`, `Google_Logo_0.svg` |
| Microsoft | `microsoft.svg` | `Microsoft_Logo_0.svg` (four squares + wordmark) |
| Instagram | `instagram-symbol.svg` + `instagram-wordmark.svg` | `Instagram_Symbol_1.svg`, `Instagram_Logo_15.svg` |
| X | `x.svg` | `X_idJxGuURW1_0.svg` — X's logo is the letter itself |
| Facebook | `facebook.png` | `Facebook_Symbol_0.png`; the pack has no wordmark, so the button names Facebook in text |
