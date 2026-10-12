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


def test_only_retail_backed_s5_h2_sized_sections_are_live_at_the_per_metre_benchmark_plus_8_percent():
    live = {}
    for p in RAW["products"]:
        if p["category_slug"] not in ("structural-timber", "timber-connectors"):
            continue
        priced = [u for u in p["units"] if u["pricing_status"] == packaged_goods.READY_STATUS]
        if not priced:
            assert p["list_price_per_metre"] is None and all(u["list_price_per_unit"] is None for u in p["units"]), p["sku"]
            continue
        # A section is live in every length or none, and only as S5 H2 sized (retail "CCA treated" counts as H2).
        assert len(priced) == 6 and (p["timber_grade"], p["timber_treatment"], p["timber_finish"]) == ("S5", "H2", "Sized"), p["sku"]
        per_metre = Decimal(str(priced[0]["market_benchmark_price"])) / Decimal("3.0")
        per_metre = per_metre.quantize(Decimal("0.01"))
        assert Decimal(str(p["list_price_per_metre"])) == (per_metre * Decimal("1.08")).quantize(Decimal("0.01"))
        for u, length in zip(priced, ("3.0", "3.6", "4.2", "4.8", "6.0", "6.6")):
            bench = (per_metre * Decimal(length)).quantize(Decimal("0.01"))
            assert Decimal(str(u["market_benchmark_price"])) == bench, (p["sku"], u["unit"])
            assert Decimal(str(u["list_price_per_unit"])) == (bench * Decimal("1.08")).quantize(Decimal("0.01"))
            assert "lowest" in u["source_note"].lower() and "H2" in u["source_note"]
        live[p["section"]] = p["list_price_per_metre"]
    assert live == {"38 × 76 mm": 24.09, "38 × 114 mm": 36.47, "38 × 228 mm": 108.56}


def test_live_timber_is_roofing_family_by_flatbed_with_the_4_percent_trade_discount():
    order = price_order(
        FRAMEWORK, [OrderLine("AA-TMB-38114-S5-H2-SZ", Decimal(20), "TIMBER_6_6M"), OrderLine("AA-ROF-DOWNPIPE-PVC-3M", Decimal(2), "EACH")], Decimal(20), "RETAIL", packaged=PACKAGED
    ).as_dict()
    assert not order["is_quote_only"]
    assert order["delivery"]["fee"] == 0 and order["notes"] == [ROOFING_DELIVERY_NOTE]
    assert order["subtotal"] == 5146.74  # 20 x 240.71 + 2 x 166.27
    trade = packaged_goods.calculate(ROOFING["AA-TMB-38114-S5-H2-SZ"], Decimal(10), "TIMBER_6_6M", "CONTRACTOR_TRADE")
    assert trade.family == "ROOFING" and trade.unit_price == Decimal("231.08")  # 240.71 x 0.96


def test_unbacked_timber_goes_to_a_quote():
    order = price_order(FRAMEWORK, [OrderLine("AA-TMB-38114-S7-H3-RS", Decimal(10), "TIMBER_6_6M")], Decimal(20), "RETAIL", packaged=PACKAGED).as_dict()
    assert order["is_quote_only"] and order["reason_codes"] == ["PRICE_ON_REQUEST"]


def test_units_outside_the_standard_lengths_are_refused():
    assert client.post("/calculate/packaged-goods", json={"sku": "AA-TMB-3876-S5-H2-SZ", "quantity": 1, "unit": "TIMBER_5_4M"}).status_code == 422
    assert client.post("/calculate/packaged-goods", json={"sku": "AA-TMB-3876-S5-H2-SZ", "quantity": 1, "unit": "SHEET_6_0M"}).status_code == 422
