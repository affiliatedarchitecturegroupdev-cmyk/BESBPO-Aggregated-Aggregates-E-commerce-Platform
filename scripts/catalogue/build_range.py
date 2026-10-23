"""Range expansion: ROADMAP Phase 2 — fifteen new departments and deeper existing ones (docs/pricing/RANGE_EXPANSION.md).

    python3 scripts/catalogue/build_range.py && python3 scripts/public-catalogues.py

Writes services/pricing/data/range_catalogue.json: categories CAT-57 onwards and their products, in the
building-supplies line (pricing family SUPPLIES, the merchant's own transport). The waves follow the roadmap:

  wave_a   Timber, Poles & Decking · Garden, Lawn & Landscaping · Outdoor Living
  wave_b   Formwork, Scaffolding & Access · Roads, Civil & Traffic · Precast Concrete · Construction Chemicals ·
           Insulation, Fire & Acoustic · deeper plumbing and electrical
  wave_c   Glass, Glazing & Aluminium · Kitchens & Built-ins · HVAC & Ventilation · Site Establishment &
           Temporary Works · Power Tools & Site Equipment · deeper flooring, security, hardware and paint
  wave_d   Prefab Buildings & Structures · Agricultural & Farm · Mining & Industrial

Every unit is quote-only (no price is invented): make, finish, price and availability are confirmed with the
supplier on the quote, and prices are added later under PRICING_POLICY.md. Unlike the older catalogues, a
category carries its typical uses and handling notes once, rather than every product repeating them.

Re-running is safe: the file is rebuilt from the wave modules.
"""
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "catalogue"))

from range_expansion import common  # noqa: E402
from range_expansion import wave_a, wave_b, wave_c, wave_d  # noqa: E402,F401

DATA = ROOT / "services/pricing/data"
OUT = DATA / "range_catalogue.json"
OTHER = ["b2b_packaged_catalogue.json", "steel_catalogue.json", "masonry_catalogue.json", "roofing_catalogue.json", "supplies_catalogue.json", "ready_mix_catalogue.json"]
ALLOWED_UNITS = {"EACH", "PACK", "ROLL", "SHEET", "SQUARE_METRE", "LINEAR_METRE", "CUBIC_METRE", "KG", "BUNDLE", "TONNE"}


def existing():
    skus, slugs, cats = set(), set(), set()
    for f in OTHER:
        raw = json.loads((DATA / f).read_text(encoding="utf-8"))
        skus |= {p["sku"] for p in raw["products"]}
        slugs |= {p["slug"] for p in raw["products"]}
        cats |= {c["slug"] for c in raw.get("categories", [])}
    framework = json.loads((DATA / "pricing_framework.json").read_text(encoding="utf-8"))
    skus |= {p["sku"] for p in framework["products"]}
    slugs |= {p["slug"] for p in framework["products"] if "slug" in p}
    return skus, slugs, cats


def check(categories, products):
    errors = []
    skus, slugs, cats = existing()
    for label, values, taken in (("sku", [p["sku"] for p in products], skus), ("slug", [p["slug"] for p in products], slugs), ("category", [c["slug"] for c in categories], cats)):
        dupes = [v for v, n in Counter(values).items() if n > 1]
        if dupes:
            errors.append(f"duplicate {label}s: {dupes[:10]}")
        clash = sorted(set(values) & taken)
        if clash:
            errors.append(f"{label}s already in another catalogue: {clash[:10]}")
    codes = [c["code"] for c in categories]
    if len(set(codes)) != len(codes):
        errors.append(f"duplicate category codes: {[c for c, n in Counter(codes).items() if n > 1]}")
    known = {c["slug"] for c in categories}
    for p in products:
        if p["category_slug"] not in known:
            errors.append(f"{p['sku']}: unknown category {p['category_slug']}")
        units = [u["unit"] for u in p["units"]]
        if len(set(units)) != len(units) or not set(units) <= ALLOWED_UNITS:
            errors.append(f"{p['sku']}: bad units {units}")
        if any(u["list_price_per_unit"] is not None for u in p["units"]):
            errors.append(f"{p['sku']}: range products are quote-only until benchmarked")
        if not p["description"].strip() or len(p["sku"]) > 48:
            errors.append(f"{p['sku']}: missing description or SKU too long")
    per_cat = Counter(p["category_slug"] for p in products)
    for c in categories:
        if per_cat[c["slug"]] < 8:
            errors.append(f"{c['slug']}: only {per_cat[c['slug']]} products")
    return errors


def main():
    categories, products = common.CATEGORIES, common.PRODUCTS
    errors = check(categories, products)
    if errors:
        sys.exit("range catalogue invalid:\n  " + "\n  ".join(errors))
    order = {c["slug"]: i for i, c in enumerate(categories)}
    products = sorted(products, key=lambda p: order[p["category_slug"]])  # stable: keeps each category's build order
    out = {
        "catalogue": "Aggregated Aggregates range expansion — ROADMAP Phase 2 (docs/pricing/RANGE_EXPANSION.md)",
        "line": "supplies",
        "pricing_family": "SUPPLIES",
        "pricing_status": common.QUOTED,
        "source_note": common.SOURCE,
        "categories": categories,
        "products": products,
    }
    OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    depts = Counter(c["department"] for c in categories)
    print(f"wrote {OUT.relative_to(ROOT)}: {len(categories)} categories in {len(depts)} departments, {len(products)} products")
    for c in categories:
        print(f"  {c['code']:7} {c['department']:22} {c['slug']:32} {Counter(p['category_slug'] for p in products)[c['slug']]}")


if __name__ == "__main__":
    main()
