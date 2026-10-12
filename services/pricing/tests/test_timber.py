"""CAT-30/31 roof & structural timber, sold with roofing: SA pine in every listed section, S5 or S7, H2 or H3, sized or
rough-sawn, in six standard lengths — quoted until two retailers back the same section, grade, hazard class and length."""
from decimal import Decimal

from fastapi.testclient import TestClient

from calculators import packaged_goods
from calculators.order import ROOFING_DELIVERY_NOTE, OrderLine, price_order
from main import FRAMEWORK, PACKAGED, app

RAW, ROOFING = packaged_goods.load_roofing()
client = TestClient(app)
TIMBER = [p for p in RAW["products"] if p["category_slug"] == "structural-timber"]
SECTIONS = {"38 × 38 mm", "38 × 76 mm", "38 × 114 mm", "38 × 152 mm", "38 × 228 mm", "50 × 76 mm", "50 × 114 mm", "50 × 152 mm", "50 × 228 mm"}
LENGTHS = ["TIMBER_3_0M", "TIMBER_3_6M", "TIMBER_4_2M", "TIMBER_4_8M", "TIMBER_6_0M", "TIMBER_6_6M"]


def test_every_section_in_every_grade_treatment_and_finish():
    combos = {(p["section"], p["timber_grade"], p["timber_treatment"], p["timber_finish"]) for p in TIMBER}
    assert len(combos) == len(TIMBER) == 72
    assert {c[0] for c in combos} == SECTIONS
    assert {c[1] for c in combos} == {"S5", "S7"}
    assert {c[2] for c in combos} == {"H2", "H3"}
    assert {c[3] for c in combos} == {"Sized", "Rough-sawn"}
    for p in TIMBER:
        assert [u["unit"] for u in p["units"]] == LENGTHS, p["sku"]
        assert p["timber_grade"] in p["name"] and p["timber_treatment"] in p["name"], p["sku"]
        assert p["roof_profile"] is None and p["cut_to_length"] is None


def test_timber_stays_quoted_until_two_matching_retail_prices_back_it():
    for p in RAW["products"]:
        if p["category_slug"] not in ("structural-timber", "timber-connectors"):
            continue
        for u in p["units"]:
            assert u["list_price_per_unit"] is None and u["market_benchmark_price"] is None, p["sku"]
            assert u["pricing_status"].startswith("Quote-only"), p["sku"]


def test_timber_is_roofing_family_by_flatbed_and_goes_to_a_quote():
    order = price_order(
        FRAMEWORK, [OrderLine("AA-TMB-38114-S5-H2-SZ", Decimal(20), "TIMBER_6_6M"), OrderLine("AA-ROF-DOWNPIPE-PVC-3M", Decimal(2), "EACH")], Decimal(20), "RETAIL", packaged=PACKAGED
    ).as_dict()
    assert order["is_quote_only"] and order["reason_codes"] == ["PRICE_ON_REQUEST"]
    assert ROOFING["AA-TMB-38114-S5-H2-SZ"].line == "roofing" and ROOFING["AA-TMB-38114-S5-H2-SZ"].own_transport
    assert ROOFING_DELIVERY_NOTE


def test_units_outside_the_standard_lengths_are_refused():
    assert client.post("/calculate/packaged-goods", json={"sku": "AA-TMB-3876-S5-H2-SZ", "quantity": 1, "unit": "TIMBER_5_4M"}).status_code == 422
    assert client.post("/calculate/packaged-goods", json={"sku": "AA-TMB-3876-S5-H2-SZ", "quantity": 1, "unit": "SHEET_6_0M"}).status_code == 422
