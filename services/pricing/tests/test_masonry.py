"""CAT-19/20 masonry: priced like packaged goods in its own family, live only where two retailers back a benchmark."""
import json
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

from fastapi.testclient import TestClient

from calculators import packaged_goods
from calculators.order import MASONRY_DELIVERY_NOTE, STEEL_DELIVERY_NOTE, OrderLine, price_order
from main import FRAMEWORK, PACKAGED, app

RAW, MASONRY = packaged_goods.load_masonry()
client = TestClient(app)
CENT = Decimal("0.01")


def cents(v: Decimal) -> Decimal:
    return v.quantize(CENT, rounding=ROUND_HALF_UP)


def test_catalogue_shape_and_counts():
    by_cat = {}
    for p in RAW["products"]:
        by_cat[p["category_slug"]] = by_cat.get(p["category_slug"], 0) + 1
    assert by_cat == {"bricks-blocks": 9, "lintels-dpc-wall-accessories": 12}
    assert [c["code"] for c in RAW["categories"]] == ["CAT-19", "CAT-20"]
    assert len({p["slug"] for p in RAW["products"]}) == len({p["sku"] for p in RAW["products"]}) == 21
    # SKUs never collide with another line's.
    assert not set(MASONRY) & (set(PACKAGED) - set(MASONRY))


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
    assert priced == 7


def test_bricks_are_sold_per_thousand_and_counts_per_m2_follow_the_joint_geometry():
    for p in RAW["products"]:
        if p["category_slug"] == "bricks-blocks":
            per = p["units_per_m2"]
            length, _, height = (int(x) for x in p["unit_size"].replace(" mm", "").split(" × "))
            # Sizes are length × width × height; a unit's wall face plus a 10 mm joint.
            assert abs(per - 1_000_000 / ((length + 10) * (height + 10))) < 1, p["sku"]
    assert {u["unit"] for p in RAW["products"] if "brick" in p["slug"] and "air" not in p["slug"] for u in p["units"]} == {"THOUSAND"}


def test_storefront_copy_matches_the_pricing_service():
    web = Path(__file__).parents[3] / "apps" / "web" / "src" / "data" / "masonry-catalogue.json"
    assert json.loads(web.read_text(encoding="utf-8")) == RAW


def test_masonry_takes_its_own_family_even_on_units_it_shares_with_steel():
    result = packaged_goods.calculate(MASONRY["AA-MAS-CLAY-STOCK"], Decimal(2), "THOUSAND", "CONTRACTOR_TRADE")
    assert result.family == "MASONRY"
    assert result.unit_price == Decimal("2457.22")  # 2,559.60 x 0.96; floor 2,370 x 1.03 = 2,441.10 not reached
    each = packaged_goods.calculate(MASONRY["AA-MAS-AIRBRICK-CONC"], Decimal(4), "EACH")
    assert each.family == "MASONRY" and each.total == Decimal("127.84")
    assert packaged_goods.calculate(PACKAGED["AA-STL-ACC-COUPLERS"], Decimal(1), "EACH", allow_unpriced=True).family == "STEEL"


def test_volume_masonry_and_unbenchmarked_units_are_quoted():
    order = price_order(
        FRAMEWORK, [OrderLine("AA-MAS-BLOCK-140", Decimal(500), "EACH")], Decimal(20), "VOLUME_CIVIL_BULK", packaged=PACKAGED
    ).as_dict()
    assert order["is_quote_only"] and "TIER_QUOTE_ONLY" in order["reason_codes"]
    assert any("bricks, blocks" in r for r in order["reasons"])
    order = price_order(FRAMEWORK, [OrderLine("AA-MAS-LINTEL-1800", Decimal(4), "EACH")], Decimal(20), "RETAIL", packaged=PACKAGED).as_dict()
    assert order["is_quote_only"] and order["reason_codes"] == ["PRICE_ON_REQUEST"]


def test_masonry_and_steel_travel_by_flatbed_with_no_tipper_fee():
    order = price_order(
        FRAMEWORK,
        [OrderLine("AA-MAS-BLOCK-140", Decimal(100), "EACH"), OrderLine("AA-MAS-DPC-110", Decimal(2), "ROLL"), OrderLine("AA-STL-BRICKFORCE-150", Decimal(3), "ROLL")],
        Decimal(25),
        "RETAIL",
        packaged=PACKAGED,
    ).as_dict()
    assert not order["is_quote_only"]
    assert order["delivery"]["fee"] == 0
    assert order["notes"] == [MASONRY_DELIVERY_NOTE, STEEL_DELIVERY_NOTE]
    assert order["subtotal"] == 1509.49  # 100 x 11.72 + 2 x 83.05 + 3 x 57.13


def test_whole_units_only_and_endpoints():
    assert len(client.get("/products/masonry").json()) == 21
    body = client.post("/calculate/packaged-goods", json={"sku": "AA-MAS-CEM-IMPERIAL", "quantity": 3, "unit": "THOUSAND"}).json()
    assert body["total"] == 10432.8
    assert client.post("/calculate/packaged-goods", json={"sku": "AA-MAS-CEM-IMPERIAL", "quantity": 1.5, "unit": "THOUSAND"}).status_code == 422
    assert client.post("/calculate/packaged-goods", json={"sku": "AA-MAS-BLOCK-140", "quantity": 1, "unit": "ROLL"}).status_code == 422
