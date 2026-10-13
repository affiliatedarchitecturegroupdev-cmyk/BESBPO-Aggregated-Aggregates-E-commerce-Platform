"""CAT-26..28 roofing: sheets in standard lengths (cut-to-length on a quote), flashings, fixings, insulation and rainwater goods — priced like packaged goods in the ROOFING family, live only where two retailers back a benchmark."""
import json
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

from fastapi.testclient import TestClient

from public_copy import public_copy
from calculators import packaged_goods
from calculators.order import MASONRY_DELIVERY_NOTE, ROOFING_DELIVERY_NOTE, OrderLine, price_order
from main import FRAMEWORK, PACKAGED, app

RAW, ROOFING = packaged_goods.load_roofing()
client = TestClient(app)
CENT = Decimal("0.01")
LENGTHS = {"SHEET_3_0M": Decimal("3.0"), "SHEET_3_6M": Decimal("3.6"), "SHEET_4_2M": Decimal("4.2"), "SHEET_4_8M": Decimal("4.8"), "SHEET_6_0M": Decimal("6.0"), "SHEET_6_6M": Decimal("6.6")}


def cents(v: Decimal) -> Decimal:
    return v.quantize(CENT, rounding=ROUND_HALF_UP)


def test_catalogue_shape_and_counts():
    by_cat = {}
    for p in RAW["products"]:
        by_cat[p["category_slug"]] = by_cat.get(p["category_slug"], 0) + 1
    assert by_cat == {"roof-sheeting": 15, "roof-flashings-fixings": 8, "roof-insulation-rainwater": 7, "structural-timber": 72, "timber-connectors": 10}
    assert [c["code"] for c in RAW["categories"]] == ["CAT-26", "CAT-27", "CAT-28", "CAT-30", "CAT-31"]
    assert len({p["slug"] for p in RAW["products"]}) == len({p["sku"] for p in RAW["products"]}) == 112
    assert RAW["standard_lengths_m"] == [3.0, 3.6, 4.2, 4.8, 6.0, 6.6]
    assert RAW["cut_to_length"] == {"min_m": 1.0, "max_m": 14.0}
    # SKUs never collide with another line's.
    assert not set(ROOFING) & (set(PACKAGED) - set(ROOFING))


def test_every_sheet_comes_in_the_six_standard_lengths_and_spans_0_30_to_0_80_mm():
    sheets = [p for p in RAW["products"] if p["category_slug"] == "roof-sheeting"]
    for p in sheets:
        assert [u["unit"] for u in p["units"]] == [*LENGTHS, "METRE"], p["sku"]
        # Cut to length is always quoted: the cutting list travels with the quote.
        assert p["units"][-1]["list_price_per_unit"] is None and "cutting list" in p["units"][-1]["source_note"], p["sku"]
        assert p["cut_to_length"] == {"min_m": 1.0, "max_m": 14.0} and p["cover_width_mm"] and p["roof_profile"], p["sku"]
    assert min(p["thickness_mm"] for p in sheets) == 0.30 and max(p["thickness_mm"] for p in sheets) == 0.80
    assert {p["roof_profile"] for p in sheets} == {"IBR", "Corrugated", "Concealed-fix"}


def test_priced_sheets_are_the_per_metre_benchmark_times_the_length_plus_8_percent():
    priced_sheets = 0
    for p in RAW["products"]:
        if p["category_slug"] != "roof-sheeting":
            continue
        priced = [u for u in p["units"] if u["pricing_status"] == packaged_goods.READY_STATUS]
        assert "METRE" not in {u["unit"] for u in priced}
        if not priced:
            assert p["list_price_per_metre"] is None, p["sku"]
            continue
        assert len(priced) == 6, p["sku"]  # a benchmarked sheet is live in every standard length
        per_metre = Decimal(str(p["units"][0]["market_benchmark_price"])) / LENGTHS["SHEET_3_0M"]
        assert Decimal(str(p["list_price_per_metre"])) == cents(cents(per_metre) * Decimal("1.08"))
        for u in priced:
            assert Decimal(str(u["market_benchmark_price"])) == cents(cents(per_metre) * LENGTHS[u["unit"]]), (p["sku"], u["unit"])
        priced_sheets += 1
    assert priced_sheets == 3


def test_every_live_price_is_lowest_retail_benchmark_times_1_08():
    priced = 0
    for p in RAW["products"]:
        for u in p["units"]:
            if u["pricing_status"] != packaged_goods.READY_STATUS:
                assert u["list_price_per_unit"] is None and u["market_benchmark_price"] is None, p["sku"]
                continue
            benchmark = Decimal(str(u["market_benchmark_price"]))
            assert Decimal(str(u["cost_per_unit"])) == benchmark
            assert cents(benchmark * Decimal("1.08")) == Decimal(str(u["list_price_per_unit"]))
            assert "lowest" in u["source_note"], p["sku"]
            priced += 1
    assert priced == 40  # 3 sheets x 6 lengths, 2 insulation rolls, 1 downpipe, IBR closures, 3 S5 H2 timber sections x 6 lengths


def test_storefront_copy_matches_the_pricing_service():
    web = Path(__file__).parents[3] / "apps" / "web" / "src" / "data" / "roofing-catalogue.json"
    assert json.loads(web.read_text(encoding="utf-8")) == public_copy("roofing_catalogue.json", RAW)


def test_roofing_takes_its_own_family_even_on_units_it_shares():
    result = packaged_goods.calculate(ROOFING["AA-ROF-IBR-047-GALV"], Decimal(10), "SHEET_3_6M", "CONTRACTOR_TRADE")
    assert result.family == "ROOFING"
    assert result.unit_price == Decimal("378.03")  # 393.78 x 0.96; floor 364.61 x 1.03 = 375.55 not reached
    roll = packaged_goods.calculate(ROOFING["AA-ROF-INSUL-GLASSWOOL-135"], Decimal(3), "ROLL")
    assert roll.family == "ROOFING" and roll.total == Decimal("2462.04")
    assert packaged_goods.calculate(PACKAGED["AA-MAS-DPC-110"], Decimal(1), "ROLL").family == "MASONRY"


def test_volume_roofing_and_unbenchmarked_sheets_are_quoted():
    order = price_order(
        FRAMEWORK, [OrderLine("AA-ROF-IBR-040-GALV", Decimal(40), "SHEET_6_0M")], Decimal(20), "VOLUME_CIVIL_BULK", packaged=PACKAGED
    ).as_dict()
    assert order["is_quote_only"] and "TIER_QUOTE_ONLY" in order["reason_codes"]
    assert any("roofing" in r for r in order["reasons"])
    order = price_order(FRAMEWORK, [OrderLine("AA-ROF-IBR-080-GALV", Decimal(4), "SHEET_6_0M")], Decimal(20), "RETAIL", packaged=PACKAGED).as_dict()
    assert order["is_quote_only"] and order["reason_codes"] == ["PRICE_ON_REQUEST"]


def test_roofing_and_tiles_travel_by_flatbed_with_no_tipper_fee():
    order = price_order(
        FRAMEWORK,
        [OrderLine("AA-ROF-IBR-050-PREPAINTED", Decimal(12), "SHEET_4_8M"), OrderLine("AA-ROF-DOWNPIPE-PVC-3M", Decimal(4), "EACH"), OrderLine("AA-TIL-DOUBLE-ROMAN", Decimal(200), "EACH")],
        Decimal(25),
        "RETAIL",
        packaged=PACKAGED,
    ).as_dict()
    assert not order["is_quote_only"]
    assert order["delivery"]["fee"] == 0
    assert order["notes"] == [ROOFING_DELIVERY_NOTE, MASONRY_DELIVERY_NOTE]
    assert order["subtotal"] == 13906.32  # 12 x 928.77 + 4 x 166.27 + 200 x 10.48


def test_whole_units_only_and_endpoints():
    assert len(client.get("/products/roofing").json()) == 112
    body = client.post("/calculate/packaged-goods", json={"sku": "AA-ROF-IBR-040-GALV", "quantity": 20, "unit": "SHEET_6_6M"}).json()
    assert body["family"] == "ROOFING" and body["total"] == 12978.6  # 20 x 648.93
    assert client.post("/calculate/packaged-goods", json={"sku": "AA-ROF-IBR-040-GALV", "quantity": 2.5, "unit": "SHEET_6_6M"}).status_code == 422
    assert client.post("/calculate/packaged-goods", json={"sku": "AA-ROF-IBR-040-GALV", "quantity": 1, "unit": "ROLL"}).status_code == 422
    # A length outside the standard set is cut to length on a quote, never priced here.
    assert client.post("/calculate/packaged-goods", json={"sku": "AA-ROF-IBR-040-GALV", "quantity": 1, "unit": "SHEET_5_4M"}).status_code == 422
    assert client.post("/calculate/packaged-goods", json={"sku": "AA-ROF-IBR-040-GALV", "quantity": 30, "unit": "METRE"}).status_code == 422
    order = price_order(FRAMEWORK, [OrderLine("AA-ROF-IBR-040-GALV", Decimal(65), "METRE")], Decimal(20), "RETAIL", packaged=PACKAGED).as_dict()
    assert order["is_quote_only"] and order["reason_codes"] == ["PRICE_ON_REQUEST"]
