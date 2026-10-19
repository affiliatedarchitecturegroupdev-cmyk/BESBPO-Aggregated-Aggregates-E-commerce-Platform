"""Applies reviewed retail price benchmarks to quote-only units (PRICING_POLICY.md, docs/pricing/BENCHMARKS.md).

    python3 scripts/catalogue/apply_benchmarks.py scripts/catalogue/benchmarks/2026-10-19.json
    python3 scripts/public-catalogues.py

Each evidence item names one unit of one product and the listings that back it:

    {"line": "supplies", "sku": "AA-ELE-CONDUIT-20", "unit": "EACH",
     "listings": [{"retailer": "Builders", "name": "...", "price": 18.0, "url": "..."},
                  {"retailer": "Chamberlains", "name": "...", "price": 19.9, "url": "..."}],
     "factor": 1, "basis": "optional: how a listing converts to our unit, e.g. 'per metre x 100'"}

The rule is checked here, not trusted: at least two different retailers, regular prices only (promotions are
never recorded), benchmark = lowest listing x factor, list = benchmark x 1.08. A unit that is already priced is
left alone unless the item says "replace": true. Retailer names and prices go only into the internal source note,
which scripts/public-catalogues.py strips from the storefront copy.
"""
import json
import sys
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "services/pricing/data"
FILES = {
    "packaged": "b2b_packaged_catalogue.json",
    "steel": "steel_catalogue.json",
    "masonry": "masonry_catalogue.json",
    "roofing": "roofing_catalogue.json",
    "supplies": "supplies_catalogue.json",
}
INDENT = {"supplies": 2}
READY = "Ready — benchmarked"
MARKUP = Decimal("1.08")


def money(x):
    return float(Decimal(str(x)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def main(evidence_path):
    evidence = json.loads(Path(evidence_path).read_text(encoding="utf-8"))
    checked = evidence["checked"]
    cats = {k: json.loads((DATA / f).read_text(encoding="utf-8")) for k, f in FILES.items()}
    index = {(k, p["sku"]): p for k, c in cats.items() for p in c["products"]}
    applied, skipped = 0, []
    for item in evidence["items"]:
        product = index.get((item["line"], item["sku"]))
        if not product:
            sys.exit(f"Unknown product {item['line']}:{item['sku']}")
        unit = next((u for u in product["units"] if u["unit"] == item["unit"]), None)
        if not unit:
            sys.exit(f"{item['sku']} has no {item['unit']} unit")
        listings = item["listings"]
        retailers = {l["retailer"] for l in listings}
        if len(retailers) < 2:
            sys.exit(f"{item['sku']}: needs two different retailers, got {sorted(retailers)}")
        if any(l.get("promo") for l in listings):
            sys.exit(f"{item['sku']}: a promotional price was recorded — promotions are excluded")
        if unit.get("list_price_per_unit") is not None and not item.get("replace"):
            skipped.append(item["sku"])
            continue
        factor = Decimal(str(item.get("factor", 1)))
        lowest = min(listings, key=lambda l: Decimal(str(l["price"])))
        bench = Decimal(str(lowest["price"])) * factor
        seen = "; ".join(f"{l['retailer']} {l['name']} R{Decimal(str(l['price'])):,.2f}" for l in sorted(listings, key=lambda l: l["price"]))
        basis = f" Basis: {item['basis']}." if item.get("basis") else ""
        unit["market_benchmark_price"] = money(bench)
        unit["cost_basis_percent"] = 100
        unit["cost_per_unit"] = money(bench)
        unit["markup_percent"] = 8
        unit["list_price_per_unit"] = money(bench * MARKUP)
        unit["pricing_status"] = READY
        unit["source_note"] = (
            f"{seen}. Benchmark = lowest regular price ({lowest['retailer']}) R{money(bench):,.2f}, list = x 1.08.{basis} "
            f"Checked {checked} on retailer product and category pages within robots.txt (regular prices only; promotions excluded)."
        )
        applied += 1
    for key, f in FILES.items():
        (DATA / f).write_text(json.dumps(cats[key], indent=INDENT.get(key, 1), ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Applied {applied} benchmarks" + (f"; left {len(skipped)} already-priced units alone" if skipped else ""))


if __name__ == "__main__":
    main(sys.argv[1])
