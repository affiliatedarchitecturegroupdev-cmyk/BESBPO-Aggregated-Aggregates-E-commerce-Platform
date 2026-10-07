"""CAT-12 ready-mix: per m³ by grade, never below a full load, pumps priced separately."""
import json
from decimal import Decimal
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from calculators import ready_mix
from calculators.discount_floor import TierQuoteOnly
from calculators.order import OrderLine, price_order
from main import FRAMEWORK, PACKAGED, READY_MIX, app

RAW, PRODUCTS, PUMPS = ready_mix.load()
client = TestClient(app)


def test_storefront_copy_matches_the_pricing_service():
    web = Path(__file__).parents[3] / "apps" / "web" / "src" / "data" / "ready-mix-catalogue.json"
    assert json.loads(web.read_text(encoding="utf-8")) == RAW


def test_only_benchmarked_grades_carry_a_price_of_benchmark_x_1_08():
    priced = [p for p in RAW["products"] if p["pricing_status"] == ready_mix.READY_STATUS]
    assert [p["strength_grade_mpa"] for p in priced] == [15, 25, 30, 35]
    for p in RAW["products"]:
        if p in priced:
            assert Decimal(str(p["list_price_per_m3"])) == (Decimal(str(p["market_benchmark_price"])) * Decimal("1.08")).quantize(Decimal("0.1"))
        else:
            assert p["list_price_per_m3"] is None and p["market_benchmark_price"] is None


def test_prices_a_full_load_at_retail_and_trade():
    grade = PRODUCTS["AA-RMX-25MPA-001"]
    retail = ready_mix.calculate(grade, Decimal(9))
    assert retail.unit_price == Decimal("1452.00") and retail.total == Decimal("13068.00")
    trade = ready_mix.calculate(grade, Decimal(12), "CONTRACTOR_TRADE")
    assert trade.unit_price == Decimal("1422.96")  # 2% off, above the floor (1452 / 1.08 x 1.03 = 1384.78)
    assert trade.discount == Decimal("0.02")


def test_refuses_a_load_below_the_minimum_an_unbenchmarked_grade_and_volume_tier():
    with pytest.raises(ready_mix.BelowMinimumLoad):
        ready_mix.calculate(PRODUCTS["AA-RMX-25MPA-001"], Decimal(6))
    with pytest.raises(ready_mix.PricingNotAvailable):
        ready_mix.calculate(PRODUCTS["AA-RMX-20MPA-001"], Decimal(6))
    with pytest.raises(TierQuoteOnly):
        ready_mix.calculate(PRODUCTS["AA-RMX-25MPA-001"], Decimal(9), "VOLUME_CIVIL_BULK")
    assert client.post("/calculate/ready-mix", json={"sku": "AA-RMX-25MPA-001", "quantity_m3": 6}).status_code == 422
    assert client.post("/calculate/ready-mix", json={"sku": "AA-RMX-40MPA-001", "quantity_m3": 6}).status_code == 422
    assert client.post("/calculate/ready-mix", json={"sku": "AA-RMX-30MPA-001", "quantity_m3": 10}).json()["total"] == 18009.0


def test_pumps_are_quote_only_until_a_written_supplier_rate_is_loaded():
    assert len(PUMPS) == 4 and not any(p.is_priced for p in PUMPS.values())
    assert client.post("/calculate/ready-mix-pump", json={"code": "PUMP-BOOM-36M", "quantity_m3": 10}).status_code == 422
    quoted = ready_mix.Pump("PUMP-TEST", "Test pump", Decimal("2500"), Decimal("45"), ready_mix.READY_STATUS)
    assert ready_mix.price_pump(quoted, Decimal(10))["total"] == 2950.0


def test_ready_mix_rides_the_mixer_truck_not_the_tipper_bands():
    only = price_order(FRAMEWORK, [OrderLine("AA-RMX-25MPA-001", Decimal(9), "m3")], Decimal(40), "RETAIL", PACKAGED, READY_MIX).as_dict()
    assert not only["is_quote_only"] and only["delivery"]["fee"] == 0.0
    assert only["total"] == 13068.0 and only["notes"]
    mixed = price_order(
        FRAMEWORK,
        [OrderLine("AA-RMX-25MPA-001", Decimal(9), "m3"), OrderLine("AA-SBC-05", Decimal(6), "m3")],
        Decimal(40), "RETAIL", PACKAGED, READY_MIX,
    ).as_dict()
    # Only the gravel counts towards the tipper load.
    assert mixed["delivery"]["load_size"] == "M3_6"
    volume = price_order(FRAMEWORK, [OrderLine("AA-RMX-25MPA-001", Decimal(9), "m3")], Decimal(10), "VOLUME_CIVIL_BULK", PACKAGED, READY_MIX).as_dict()
    assert volume["is_quote_only"] and "TIER_QUOTE_ONLY" in volume["reason_codes"]
    response = client.post("/calculate/order", json={"lines": [{"sku": "AA-RMX-15MPA-001", "unit": "m3", "quantity": 10}], "distance_km": 5})
    assert response.status_code == 422  # 15 MPa is batched in 30m³ loads
