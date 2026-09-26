"""
Reconciles the pricing service against the pricing framework workbook to
the cent — the QA bar the platform spec sets (roadmap Phase 5), run on
every change rather than once before launch.

Expected values are the workbook's own computed cells (the values Excel
cached when the workbook was last saved), not numbers re-derived here, so a
formula the service gets wrong cannot hide behind the same mistake in the
test.
"""
import re
import sys
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

import openpyxl
import pytest

SERVICE_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(SERVICE_DIR))
sys.path.insert(0, str(SERVICE_DIR / "scripts"))

import pricing_framework  # noqa: E402
from calculators.tonnage_volume import unit_price  # noqa: E402
from import_pricing_framework import OUTPUT_PATHS, WORKBOOK_PATH, import_workbook, render  # noqa: E402

FRAMEWORK = pricing_framework.load()
WORKBOOK = openpyxl.load_workbook(WORKBOOK_PATH, data_only=True)
CATALOGUE = WORKBOOK["Sample Priced Catalogue"]
PRODUCTS_BY_ROW = {row: p for row, p in enumerate(FRAMEWORK.raw["products"], start=2)}


def cents(value) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def test_generated_files_match_workbook():
    rendered = render(import_workbook())
    for path in OUTPUT_PATHS:
        assert path.read_text() == rendered, (
            f"{path} is out of date with the workbook — run "
            "`python services/pricing/scripts/import_pricing_framework.py`"
        )


def test_every_catalogue_row_is_priced():
    assert CATALOGUE.max_row - 1 == len(FRAMEWORK.products) == 48
    for row, product in PRODUCTS_BY_ROW.items():
        assert CATALOGUE[f"B{row}"].value == product["name"]


@pytest.mark.parametrize("row", sorted(PRODUCTS_BY_ROW))
def test_catalogue_row_reconciles_to_the_cent(row):
    sku = PRODUCTS_BY_ROW[row]["sku"]
    product = FRAMEWORK.products[sku]
    trade = FRAMEWORK.tiers["CONTRACTOR_TRADE"].discount
    volume = FRAMEWORK.tiers["VOLUME_CIVIL_BULK"].discount

    assert product.bulk_density_kg_per_m3 == Decimal(str(CATALOGUE[f"D{row}"].value))
    assert unit_price(product, "ton") == cents(CATALOGUE[f"G{row}"].value)
    assert unit_price(product, "m3") == cents(CATALOGUE[f"H{row}"].value)
    assert unit_price(product, "ton", trade) == cents(CATALOGUE[f"K{row}"].value)
    assert unit_price(product, "ton", volume) == cents(CATALOGUE[f"L{row}"].value)

    bag_price = CATALOGUE[f"J{row}"].value
    if bag_price in (None, ""):
        assert not product.is_sold_bagged
    else:
        assert unit_price(product, "bag") == cents(bag_price)


def test_category_bands_reconcile_to_the_cent():
    ws = WORKBOOK["Category Markup Bands"]
    for row, category in enumerate(FRAMEWORK.raw["categories"], start=2):
        assert ws[f"A{row}"].value == category["name"]
        assert cents(category["list_price_per_ton"]) == cents(ws[f"E{row}"].value)
        assert cents(category["list_price_per_m3"]) == cents(ws[f"F{row}"].value)


def test_customer_tier_discounts_match():
    ws = WORKBOOK["Customer Tiers"]
    for row, name in ((2, "RETAIL"), (3, "CONTRACTOR_TRADE"), (4, "VOLUME_CIVIL_BULK")):
        assert FRAMEWORK.tiers[name].discount == Decimal(str(ws[f"C{row}"].value))


def test_delivery_fees_match():
    ws = WORKBOOK["Delivery & Additional Charges"]
    bands = {b.label: b for b in FRAMEWORK.delivery.bands}
    for row, label in ((5, "BAND_30_60"), (6, "BAND_60_100")):
        for col, size in (("B", "M3_6"), ("C", "M3_10"), ("D", "M3_14_PLUS")):
            assert bands[label].fees[size] == Decimal(str(ws[f"{col}{row}"].value))


def test_storefront_categories_match_workbook():
    categories_ts = (SERVICE_DIR.parent.parent / "apps" / "web" / "src" / "data" / "categories.ts").read_text()
    storefront_slugs = re.findall(r'slug: "([a-z0-9-]+)"', categories_ts)
    assert storefront_slugs == [c["slug"] for c in FRAMEWORK.raw["categories"]]
