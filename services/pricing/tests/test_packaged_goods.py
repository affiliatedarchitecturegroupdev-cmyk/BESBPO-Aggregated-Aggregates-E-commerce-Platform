"""CAT-10/CAT-11 packaged goods: priced only where the B2B workbook has a real benchmark."""
import json
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from calculators import packaged_goods
from calculators.order import OrderLine, price_order
from main import FRAMEWORK, app

RAW, PACKAGED = packaged_goods.load()
client = TestClient(app)
CENT = Decimal("0.01")


def cents(v: Decimal) -> Decimal:
    return v.quantize(CENT, rounding=ROUND_HALF_UP)


def test_every_published_price_reconciles_with_its_benchmark_and_markup():
    """List = ROUND(ROUND(benchmark x cost basis) x (1 + markup)) — the workbook's own formula."""
    priced = 0
    for product in RAW["products"]:
        for unit in product["units"]:
            if unit["pricing_status"] != packaged_goods.READY_STATUS:
                assert unit["list_price_per_unit"] is None, f"{product['sku']} {unit['unit']} has a price without a benchmark"
                continue
            benchmark = Decimal(str(unit["market_benchmark_price"]))
            cost = cents(benchmark * Decimal(str(unit["cost_basis_percent"])) / 100)
            assert cost == Decimal(str(unit["cost_per_unit"]))
            assert cents(cost * (1 + Decimal(str(unit["markup_percent"])) / 100)) == Decimal(str(unit["list_price_per_unit"]))
            priced += 1
    assert priced == 2  # 42.5N cement 50kg bag and non-shrink grout 25kg bag


def test_storefront_copy_matches_the_pricing_service():
    web = Path(__file__).parents[3] / "apps" / "web" / "src" / "data" / "b2b-packaged-catalogue.json"
    assert json.loads(web.read_text(encoding="utf-8")) == RAW


def test_tier_discount_applies_to_a_benchmarked_unit():
    result = packaged_goods.calculate(PACKAGED["AA-CEM-425N-001"], Decimal(20), "BAG_50KG", Decimal("0.08"))
    assert result.unit_price == Decimal("104.33")  # 113.40 x 0.92 = 104.328
    assert result.total == Decimal("2086.60")
    assert result.bagged_kg == Decimal(1000)


def test_refuses_to_price_an_unbenchmarked_unit():
    with pytest.raises(packaged_goods.PricingNotAvailable):
        packaged_goods.calculate(PACKAGED["AA-ADM-ACCEL-001"], Decimal(1), "DRUM_210L")
    response = client.post("/calculate/packaged-goods", json={"sku": "AA-ADM-ACCEL-001", "unit": "DRUM_210L", "quantity": 1})
    assert response.status_code == 422
    assert "no confirmed price" in response.json()["detail"]


def test_rejects_units_the_product_isnt_sold_in_and_fractional_units():
    assert client.post("/calculate/packaged-goods", json={"sku": "AA-GRT-NSHRINK-001", "unit": "BAG_50KG", "quantity": 1}).status_code == 422
    assert client.post("/calculate/packaged-goods", json={"sku": "AA-GRT-NSHRINK-001", "unit": "BAG_25KG", "quantity": 1.5}).status_code == 422
    assert client.post("/calculate/packaged-goods", json={"sku": "AA-SBC-01", "unit": "BAG_25KG", "quantity": 1}).status_code == 404


def test_bagged_cement_rides_the_bagged_delivery_rules():
    result = price_order(FRAMEWORK, [OrderLine("AA-CEM-425N-001", Decimal(10), "BAG_50KG")], Decimal(12), "RETAIL", PACKAGED)
    body = result.as_dict()
    assert not result.is_quote_only
    assert body["subtotal"] == 1134.0
    assert body["delivery"]["fee"] == 350.0  # 500kg is under the 1-ton free-delivery threshold
    assert body["total"] == 1484.0


def test_unpriced_or_bulk_format_packaged_lines_make_the_order_quote_only():
    mixed = price_order(
        FRAMEWORK,
        [OrderLine("AA-SBC-05", Decimal(6), "m3"), OrderLine("AA-CEM-525N-001", Decimal(10), "BAG_50KG")],
        Decimal(20), "RETAIL", PACKAGED,
    ).as_dict()
    assert mixed["is_quote_only"] and mixed["total"] is None
    assert "PRICE_ON_REQUEST" in mixed["reason_codes"]
    assert mixed["lines"][1]["unit_price"] is None
    assert mixed["subtotal"] == mixed["lines"][0]["total"]  # only priced lines count

    drums = price_order(FRAMEWORK, [OrderLine("AA-ADM-PLAST-001", Decimal(2), "DRUM_210L")], Decimal(20), "RETAIL", PACKAGED).as_dict()
    assert drums["is_quote_only"]
    assert set(drums["reason_codes"]) == {"PRICE_ON_REQUEST", "PACKAGED_BULK_DELIVERY"}


def test_order_endpoint_accepts_packaged_units():
    response = client.post(
        "/calculate/order",
        json={"lines": [{"sku": "AA-GRT-NSHRINK-001", "unit": "BAG_25KG", "quantity": 4}], "distance_km": 5, "customer_tier": "CONTRACTOR_TRADE"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["lines"][0]["unit_price"] == 246.31  # 267.73 x 0.92 = 246.3116
    assert body["total"] == 985.24 + 350.0
