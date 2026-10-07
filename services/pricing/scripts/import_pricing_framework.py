"""
Imports the Aggregated Aggregates pricing framework workbook into the JSON
the platform runs on.

    python scripts/import_pricing_framework.py            # regenerate
    python scripts/import_pricing_framework.py --check    # fail if stale

Reads only the workbook's *inputs* — Category Markup Bands (density, base
cost, markup, bag premium), Customer Tiers (discounts), Delivery &
Additional Charges, and the product list on Sample Priced Catalogue — and
writes them, plus the prices derived from them by the pricing service's own
calculators, to:

    services/pricing/data/pricing_framework.json   (pricing service, DB seed)
    apps/web/src/data/pricing-framework.json       (storefront display)

The workbook is the single source of truth (AGENTIC_RULES.md rule 1): to
change a price, change the workbook and re-run this script. Anything the
script does not recognise — a new category, a reworded delivery rule — is
an error, not a guess.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from decimal import Decimal
from pathlib import Path

import openpyxl

SERVICE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = SERVICE_DIR.parent.parent
sys.path.insert(0, str(SERVICE_DIR))

from calculators.tonnage_volume import tier_unit_price, to_cents, unit_price  # noqa: E402
from pricing_framework import build  # noqa: E402

WORKBOOK_PATH = REPO_ROOT / "docs" / "pricing" / "aggregated-aggregates-pricing-framework.xlsx"
# Approved aggregates the workbook doesn't list, priced by their category band.
ADDITIONAL_PATH = SERVICE_DIR / "data" / "additional_aggregates.json"
OUTPUT_PATHS = [
    SERVICE_DIR / "data" / "pricing_framework.json",
    REPO_ROOT / "apps" / "web" / "src" / "data" / "pricing-framework.json",
]

# Workbook category name -> (storefront slug, SKU code, reference standard).
# Standards are the three the platform spec names (Module 5); categories it
# does not map are left for the Phase 3 compliance-document work.
CATEGORY_MAP = {
    "Sub-Base & Base Course Materials": ("sub-base-base-course", "SBC", "SANS 1200-G"),
    "Crushed Stone Aggregates": ("crushed-stone", "CRS", "SANS 1083"),
    "Sand & Fine Aggregates": ("sand-fine-aggregates", "SND", None),
    "Crusher Run & Road-Building Materials": ("crusher-run-road-building", "CRR", "COLTO/TRH14"),
    "Ballast & Rail Aggregate": ("ballast-rail", "BAL", None),
    "Drainage & Filter Aggregates": ("drainage-filter", "DRN", None),
    "Decorative & Landscaping Aggregates": ("decorative-landscaping", "DEC", None),
    "Agricultural & Industrial Aggregates": ("agricultural-industrial", "AGR", None),
    "Recycled & Sustainable Aggregates": ("recycled-sustainable", "REC", None),
}

# Customer Tiers sheet label -> platform tier. The ≥10m³ quote-only threshold
# comes from the Volume/Civil Bulk definition on that sheet and applies to
# that tier only (confirmed by Fortune ahead of Phase 2). PO/invoice billing
# for Volume accounts is from the spec's Payment Strategy.
TIER_MAP = {
    "Retail / Walk-in": ("RETAIL", None, False),
    "Contractor / Trade Account": ("CONTRACTOR_TRADE", None, False),
    "Volume / Civil Bulk": ("VOLUME_CIVIL_BULK", 10, True),
}

LOAD_SIZE_COLUMNS = {"B": "M3_6", "C": "M3_10", "D": "M3_14_PLUS"}
TIERS_WITH_PRICES = ("RETAIL", "CONTRACTOR_TRADE", "VOLUME_CIVIL_BULK")


class WorkbookError(ValueError):
    pass


def expect(condition: bool, message: str) -> None:
    if not condition:
        raise WorkbookError(message)


def match(pattern: str, text, where: str) -> re.Match:
    m = re.fullmatch(pattern, str(text or "").strip())
    expect(m is not None, f"{where}: expected text matching {pattern!r}, found {text!r}")
    return m


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def number(value, where: str) -> float | int:
    expect(isinstance(value, (int, float)) and not isinstance(value, bool), f"{where}: expected a number, found {value!r}")
    return value


def read_categories(wb) -> list[dict]:
    ws = wb["Category Markup Bands"]
    header = [c.value for c in ws[1]]
    expect(
        header[:7]
        == [
            "Category",
            "Bulk Density (kg/m³)",
            "Base Cost (R/ton)",
            "Markup %",
            "List Price (R/ton)",
            "List Price (R/m³)",
            "Bag Premium Multiplier (vs bulk R/ton)",
        ],
        f"Category Markup Bands: unexpected header {header}",
    )
    categories = []
    for row in range(2, ws.max_row + 1):
        name = ws[f"A{row}"].value
        if name is None:
            break
        expect(name in CATEGORY_MAP, f"Category Markup Bands!A{row}: unknown category {name!r} — add it to CATEGORY_MAP")
        slug, code, standard = CATEGORY_MAP[name]
        categories.append(
            {
                "slug": slug,
                "name": name,
                "sku_code": code,
                "grading_standard": standard,
                "bulk_density_kg_per_m3": number(ws[f"B{row}"].value, f"Category Markup Bands!B{row}"),
                "base_cost_per_ton": number(ws[f"C{row}"].value, f"Category Markup Bands!C{row}"),
                "markup": number(ws[f"D{row}"].value, f"Category Markup Bands!D{row}"),
                "bag_premium_multiplier": number(ws[f"G{row}"].value, f"Category Markup Bands!G{row}"),
            }
        )
    expect(len(categories) == len(CATEGORY_MAP), f"Category Markup Bands: expected {len(CATEGORY_MAP)} categories, found {len(categories)}")
    return categories


def read_tiers(wb) -> list[dict]:
    ws = wb["Customer Tiers"]
    tiers = []
    for row in range(2, ws.max_row + 1):
        label = ws[f"A{row}"].value
        if label is None:
            break
        expect(label in TIER_MAP, f"Customer Tiers!A{row}: unknown tier {label!r}")
        name, quote_only_min_m3, requires_po = TIER_MAP[label]
        tiers.append(
            {
                "name": name,
                "label": label,
                "definition": ws[f"B{row}"].value,
                "discount": number(ws[f"C{row}"].value, f"Customer Tiers!C{row}"),
                "quote_only_min_m3": quote_only_min_m3,
                "requires_po_invoice": requires_po,
            }
        )
    expect([t["name"] for t in tiers] == list(TIERS_WITH_PRICES), f"Customer Tiers: unexpected tiers {tiers}")
    return tiers


def read_delivery(wb) -> dict:
    ws = wb["Delivery & Additional Charges"]
    expect(
        [ws[f"{col}3"].value for col in "ABCD"]
        == ["Distance Band", "6m³ Load (~9-10t)", "10m³ Load (~15-16t)", "14m³+ / 34-ton Interlink"],
        "Delivery & Additional Charges!A3:D3: unexpected load-size header",
    )

    bands = []
    m = match(r"(\d+)-(\d+)km \(standard metro\)", ws["A4"].value, "Delivery & Additional Charges!A4")
    for col in LOAD_SIZE_COLUMNS:
        expect(ws[f"{col}4"].value == "Included in list price", f"Delivery & Additional Charges!{col}4: expected 'Included in list price'")
    bands.append({"label": "INCLUDED_0_30", "min_km": int(m[1]), "max_km": int(m[2]), "fees": {}})

    for row, label in ((5, "BAND_30_60"), (6, "BAND_60_100")):
        m = match(r"(\d+)-(\d+)km", ws[f"A{row}"].value, f"Delivery & Additional Charges!A{row}")
        fees = {
            size: number(ws[f"{col}{row}"].value, f"Delivery & Additional Charges!{col}{row}")
            for col, size in LOAD_SIZE_COLUMNS.items()
        }
        bands.append({"label": label, "min_km": int(m[1]), "max_km": int(m[2]), "fees": fees})

    quote = match(r">(\d+)km", ws["A7"].value, "Delivery & Additional Charges!A7")
    for col in LOAD_SIZE_COLUMNS:
        expect(
            str(ws[f"{col}7"].value).startswith("Quote individually"),
            f"Delivery & Additional Charges!{col}7: expected 'Quote individually'",
        )
    quote_over_km = int(quote[1])
    for lower, upper in zip(bands, bands[1:]):
        expect(lower["max_km"] == upper["min_km"], "Delivery bands are not contiguous")
    expect(bands[-1]["max_km"] == quote_over_km, "Last priced band must end where quoting starts")

    expect(ws["A10"].value == "Minimum order for bulk tipper delivery", "Delivery & Additional Charges!A10 moved")
    minimum = match(r"(\d+)m³ or (\d+) tons, whichever the product's unit favours", ws["B10"].value, "Delivery & Additional Charges!B10")
    expect(ws["A11"].value == "Below minimum (bakkie/LDV small-load delivery)", "Delivery & Additional Charges!A11 moved")
    small = match(r"Flat R(\d+), within (\d+)km only", ws["B11"].value, "Delivery & Additional Charges!B11")
    expect(ws["A12"].value == "Bagged/palletised orders under 1 ton", "Delivery & Additional Charges!A12 moved")
    bagged = match(
        r"Flat R(\d+) within (\d+)km; free over (\d+) ton within (\d+)km",
        ws["B12"].value,
        "Delivery & Additional Charges!B12",
    )
    expect(bagged[2] == bagged[4], "Delivery & Additional Charges!B12: bagged fee and free-delivery radius differ")

    return {
        "bands": bands,
        "quote_over_km": quote_over_km,
        "min_bulk_m3": int(minimum[1]),
        "min_bulk_tons": int(minimum[2]),
        "small_load_fee": int(small[1]),
        "small_load_max_km": int(small[2]),
        "bagged_fee": int(bagged[1]),
        "bagged_max_km": int(bagged[2]),
        "bagged_free_from_kg": int(bagged[3]) * 1000,
    }


def read_products(wb, categories: list[dict]) -> list[dict]:
    ws = wb["Sample Priced Catalogue"]
    expect(ws["B1"].value == "Product Name" and ws["C1"].value == "Unit of Sale" and ws["I1"].value == "Bag Weight (kg)",
           "Sample Priced Catalogue: unexpected header")
    by_name = {c["name"]: c for c in categories}
    counters: dict[str, int] = {}
    products = []
    for row in range(2, ws.max_row + 1):
        category_name = ws[f"A{row}"].value
        if category_name is None:
            break
        expect(category_name in by_name, f"Sample Priced Catalogue!A{row}: unknown category {category_name!r}")
        category = by_name[category_name]
        name = ws[f"B{row}"].value
        unit_label = ws[f"C{row}"].value
        bag_weight = ws[f"I{row}"].value

        units = [u for u, token in (("ton", "ton"), ("m3", "m³"), ("bag", "bag")) if token in unit_label]
        expect(units, f"Sample Priced Catalogue!C{row}: no unit of sale in {unit_label!r}")
        expect(("bag" in units) == (bag_weight is not None),
               f"Sample Priced Catalogue!C{row}/I{row}: '{unit_label}' disagrees with bag weight {bag_weight!r}")

        counters[category["sku_code"]] = counters.get(category["sku_code"], 0) + 1
        products.append(
            {
                "sku": f"AA-{category['sku_code']}-{counters[category['sku_code']]:02d}",
                "slug": slugify(name),
                "name": name,
                "category_slug": category["slug"],
                "grading_standard": category["grading_standard"],
                "unit_of_sale_label": unit_label,
                "units": units,
                "bag_weight_kg": None if bag_weight is None else number(bag_weight, f"Sample Priced Catalogue!I{row}"),
            }
        )
    slugs = [p["slug"] for p in products]
    expect(len(set(slugs)) == len(slugs), "Duplicate product slugs")
    return products


def read_additional(categories: list[dict], products: list[dict]) -> list[dict]:
    """Approved aggregates the workbook's catalogue sheet doesn't list — numbered after its rows, priced by category band."""
    raw = json.loads(ADDITIONAL_PATH.read_text(encoding="utf-8"))
    by_slug = {c["slug"]: c for c in categories}
    counters: dict[str, int] = {}
    for p in products:
        code = p["sku"].split("-")[1]
        counters[code] = max(counters.get(code, 0), int(p["sku"].split("-")[2]))
    extra = []
    for item in raw["products"]:
        expect(item["category_slug"] in by_slug, f"additional_aggregates.json: unknown category {item['category_slug']!r}")
        expect(set(item["units"]) <= {"ton", "m3"}, f"additional_aggregates.json: {item['name']} — bulk units only")
        category = by_slug[item["category_slug"]]
        counters[category["sku_code"]] = counters.get(category["sku_code"], 0) + 1
        unit_label = " / ".join(f"per {'m³' if u == 'm3' else u}" for u in sorted(item["units"], key=["m3", "ton"].index))
        extra.append(
            {
                "sku": f"AA-{category['sku_code']}-{counters[category['sku_code']]:02d}",
                "slug": slugify(item["name"]),
                "name": item["name"],
                "category_slug": category["slug"],
                "grading_standard": item["grading_standard"],
                "unit_of_sale_label": unit_label,
                "units": item["units"],
                "bag_weight_kg": None,
                "source": "category-band",
            }
        )
    return extra


def add_derived_prices(data: dict) -> None:
    """Price every product with the service's own calculators, for display and seeding."""
    framework = build(data)
    by_slug = {c["slug"]: c for c in data["categories"]}
    for category in data["categories"]:
        base = Decimal(str(category["base_cost_per_ton"])) * (1 + Decimal(str(category["markup"])))
        category["list_price_per_ton"] = float(to_cents(base))
        category["list_price_per_m3"] = float(to_cents(base * Decimal(str(category["bulk_density_kg_per_m3"])) / 1000))
    for p in data["products"]:
        product = framework.products[p["sku"]]
        category = by_slug[p["category_slug"]]
        p["bulk_density_kg_per_m3"] = category["bulk_density_kg_per_m3"]
        p["bag_premium_multiplier"] = category["bag_premium_multiplier"] if product.is_sold_bagged else None
        # List prices for every unit the product can be measured in, offered
        # or not (the DB price band stores R/ton and R/m3 for every product).
        p["list_prices"] = {
            unit: float(unit_price(product, unit))
            for unit in ("ton", "m3", "bag")
            if unit != "bag" or product.is_sold_bagged
        }
        # Tier prices for the units the product is actually sold in.
        p["prices"] = {
            tier: {unit: float(tier_unit_price(product, unit, tier).unit_price) for unit in product.units}
            for tier in TIERS_WITH_PRICES
        }


def import_workbook(path: Path = WORKBOOK_PATH) -> dict:
    wb = openpyxl.load_workbook(path)
    version = match(r"Version ([\d.]+) — (.+)", wb["Overview"]["A3"].value, "Overview!A3")
    categories = read_categories(wb)
    data = {
        "_generated": (
            "Generated by services/pricing/scripts/import_pricing_framework.py from "
            "docs/pricing/aggregated-aggregates-pricing-framework.xlsx. Do not edit by hand."
        ),
        "source": {"workbook": WORKBOOK_PATH.name, "version": version[1], "date": version[2]},
        "categories": categories,
        "customer_tiers": read_tiers(wb),
        "delivery": read_delivery(wb),
        "products": read_products(wb, categories),
    }
    data["products"] += read_additional(categories, data["products"])
    slugs = [p["slug"] for p in data["products"]]
    expect(len(set(slugs)) == len(slugs), "Duplicate product slugs")
    add_derived_prices(data)
    return data


def render(data: dict) -> str:
    return json.dumps(data, indent=2, ensure_ascii=False) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="exit non-zero if the generated files are out of date")
    args = parser.parse_args()

    rendered = render(import_workbook())
    stale = [path for path in OUTPUT_PATHS if not path.exists() or path.read_text() != rendered]
    if args.check:
        for path in stale:
            print(f"out of date: {path.relative_to(REPO_ROOT)}", file=sys.stderr)
        return 1 if stale else 0
    for path in OUTPUT_PATHS:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(rendered)
        print(f"wrote {path.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
