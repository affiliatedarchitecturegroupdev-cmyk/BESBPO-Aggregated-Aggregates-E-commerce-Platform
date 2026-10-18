# Bill of quantities (BOQ) upload

`/quote/boq`: upload a BOQ, check the suggested products, send it as one
quote request with the file attached. Code: `apps/api/src/boq/`.

## Steps

1. **Upload** an Excel workbook (`.xlsx`) or CSV, up to 5 MB. The first
   worksheet is read by a small built-in reader (`xlsx.ts`, no third-party
   library; sizes are capped). CSV with commas or semicolons both work.
   `.xls` and PDF aren't read — the page says to save as .xlsx/CSV, or to
   email a PDF with the normal quote form.
2. **Columns**: found by header (*Description*, *Qty*/*Quantity*, *Unit*/
   *UOM*), else guessed (longest text column, first numeric column).
   Quantities like `1 250,5` and `1,250.5` are understood; totals and
   carried-forward rows are skipped; up to 200 lines.
3. **Matching**: each line's words (sizes and grades count double) are
   compared with every active product's name, SKU and category. A product is
   suggested only if at least half of the line's words match; up to three
   are offered, best first, with the unit taken from the BOQ (m³, t, 50kg,
   bags, 6 m…) where the product sells in it — otherwise flagged *Check the
   unit*. Nothing is stored at this step.
4. **Review**: the customer picks the product (or *Quote as written*), the
   unit and the quantity for each line, and can untick lines.
5. **Send**: matched lines (up to 30) become the quote's lines, priced at the
   requester's tier like any quote; unmatched lines go into the quote's notes
   as written. The file is stored (`boq/<yyyy-mm>/…`) and linked from
   *Admin → Quotes*; the requester can download it too.

## Decisions for the owner to review

1. **No XLSX library** — a small built-in reader, to keep the dependency
   surface small. It reads values, not formulas' live results beyond what
   Excel saved.
2. **Suggestions need confirmation**: nothing is matched silently.
3. **PDF BOQs** aren't parsed (scanned PDFs can't be read reliably) — they go
   by email to sales.
