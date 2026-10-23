"""Shared helpers for the range expansion builder (scripts/catalogue/build_range.py, docs/pricing/RANGE_EXPANSION.md).

Every product here is a standard South African trade type and size (compiled for the roadmap, not yet confirmed
supplier by supplier — the supplier price lists of Phase 1 do that), and every unit is quote-only: make, finish, price and availability are confirmed with the supplier on the quote.
Prices are added later under PRICING_POLICY.md (supplier price lists first, then two SA retailers, list = lowest
x 1.08) — never invented here.
"""
import re

OWNED = "range-2026-10"
QUOTED = "Quote-only — no retail benchmark"
SOURCE = (
    "Range expansion (ROADMAP Phase 2), compiled 2026-10-23: a standard South African trade type and size, not yet "
    "confirmed with a named supplier. Make, size, finish, price and availability are confirmed with the supplier on the quote."
)

CATEGORIES: list[dict] = []
PRODUCTS: list[dict] = []


def slug(name: str) -> str:
    s = name.lower()
    for a, b in (("×", "x"), ("&", "and"), ("²", "2"), ("³", "3"), ("°", ""), ("µ", "u"), ("ø", "dia"), ("½", "-half"), ("¾", "-three-quarter"), ("¼", "-quarter"), ("⅜", "-3-8"), ("⅝", "-5-8"), ("%", "-pct")):
        s = s.replace(a, b)
    s = re.sub(r"(\d)\.(\d)", r"\1-\2", s)
    s = re.sub(r"(\d),(\d)", r"\1\2", s)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def code(*parts) -> str:
    """An SKU from a prefix and free text: upper-case words joined by dashes ("38 × 114" -> "38X114").

    Long SKUs abbreviate their words to four letters (numbers stay whole) so they stay under 48 characters.
    """
    words = []
    for p in parts:
        text = re.sub(r"(\d)\s*×\s*(\d)", r"\1X\2", str(p).upper().replace("–", "-"))
        text = text.replace("½", "-HALF").replace("¾", "-3Q").replace("¼", "-1Q").replace("⅜", "-3E").replace("⅝", "-5E").replace("²", "2")
        words += re.findall(r"[A-Z0-9]+", text)
    sku = "-".join(words)
    if len(sku) > 44:
        head, rest = words[:2], words[2:]
        sku = "-".join(head + [w if w.isdigit() or any(ch.isdigit() for ch in w) else w[:4] for w in rest])
    return sku[:48].rstrip("-")


def category(slug_: str, name: str, cat_code: str, department: str, description: str, uses: list[str], handling: str):
    CATEGORIES.append({
        "slug": slug_, "name": name, "code": cat_code, "department": department, "description": description,
        "typical_uses": uses, "handling_notes": handling,
    })
    return slug_


def unit(unit_code: str, label: str) -> dict:
    return {
        "unit": unit_code, "unit_label": label, "weight_kg": None, "market_benchmark_price": None, "cost_basis_percent": 100,
        "cost_per_unit": None, "markup_percent": 8, "list_price_per_unit": None, "pricing_status": QUOTED, "source_note": SOURCE,
    }


EACH = (("EACH", "Each"),)
M2 = (("SQUARE_METRE", "Per m²"),)
LM = (("LINEAR_METRE", "Per metre"),)
KG = (("KG", "Per kg"),)


def P(sku: str, name: str, cat: str, standard: str | None, desc: str, units=EACH, unit_size: str | None = None):
    PRODUCTS.append({
        "sku": sku, "slug": slug(name), "name": name, "category_slug": cat, "grading_standard": standard,
        "description": desc, "unit_size": unit_size, "units": [unit(c, l) for c, l in units],
    })


def fmt(x) -> str:
    """1.8 -> '1.8', 2.0 -> '2.0' for lengths in metres; ints stay ints."""
    return f"{x:.1f}" if isinstance(x, float) else str(x)
