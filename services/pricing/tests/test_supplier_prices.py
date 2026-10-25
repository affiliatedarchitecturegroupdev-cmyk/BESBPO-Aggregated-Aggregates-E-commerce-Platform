"""Approved supplier prices (docs/supplier-prices.md): they stand in for a unit's list price at checkout."""
import sys
from decimal import Decimal
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent.parent))

from calculators import packaged_goods  # noqa: E402
from main import PACKAGED, app  # noqa: E402

client = TestClient(app)
SKU = "AA-TMB-POLE-CCA-5075-1-8"  # a quote-only range product sold EACH


def order(tier="RETAIL", overrides=None, unit="EACH", quantity=10):
    return client.post(
        "/calculate/order",
        json={"lines": [{"sku": SKU, "quantity": quantity, "unit": unit}], "distance_km": 10, "customer_tier": tier, "price_overrides": overrides or []},
    )


def test_a_quote_only_unit_is_priced_by_an_approved_supplier_price():
    assert order().json()["is_quote_only"] is True
    override = [{"sku": SKU, "unit": "EACH", "list_price": 54.0, "markup_percent": 20}]
    body = order(overrides=override).json()
    line = body["lines"][0]
    assert body["is_quote_only"] is False
    assert line["unit_price"] == 54.0 and line["total"] == 540.0
    assert line["unit_cost"] == 45.0  # 54 / 1.20
    assert line["markup_percent"] == 20.0
    assert line["source_note"] == packaged_goods.SUPPLIER_PRICE_NOTE


def test_tier_discounts_and_the_margin_floor_still_apply():
    # 4% trade discount on 54.00 is 51.84; the floor (cost 45 × 1.03 = 46.35) is lower, so it doesn't bite.
    trade = order("CONTRACTOR_TRADE", [{"sku": SKU, "unit": "EACH", "list_price": 54.0, "markup_percent": 20}]).json()
    assert trade["lines"][0]["unit_price"] == 51.84
    # A thin 5% markup: the floor (cost 100.95 × 1.03 = 103.98) stops the 4% discount (101.76) going below it.
    thin = order("CONTRACTOR_TRADE", [{"sku": SKU, "unit": "EACH", "list_price": 106.0, "markup_percent": 5}]).json()
    assert thin["lines"][0]["unit_price"] == 103.98
    # Volume / Civil Bulk is still quoted for building supplies.
    assert order("VOLUME_CIVIL_BULK", [{"sku": SKU, "unit": "EACH", "list_price": 54.0, "markup_percent": 20}]).json()["is_quote_only"] is True


def test_overrides_never_change_the_loaded_catalogue_or_unknown_units():
    patched = packaged_goods.with_overrides(PACKAGED, [packaged_goods.PriceOverride(SKU, "EACH", Decimal("54"), Decimal("0.2")), packaged_goods.PriceOverride("NOPE", "EACH", Decimal("1"), Decimal("0"))])
    assert patched[SKU].units["EACH"].list_price == Decimal("54")
    assert PACKAGED[SKU].units["EACH"].list_price is None
    assert "NOPE" not in patched
    # An override for a unit the product isn't sold in is ignored.
    assert order(overrides=[{"sku": SKU, "unit": "PACK", "list_price": 54.0, "markup_percent": 20}]).json()["is_quote_only"] is True


def test_override_validation():
    assert order(overrides=[{"sku": SKU, "unit": "EACH", "list_price": 0, "markup_percent": 20}]).status_code == 422
    assert order(overrides=[{"sku": SKU, "unit": "EACH", "list_price": 10, "markup_percent": -1}]).status_code == 422
