"""CAT-15..18 steel: priced like packaged goods, live only where two retailers back a benchmark."""
import json
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

from fastapi.testclient import TestClient

from calculators import packaged_goods
from calculators.order import STEEL_DELIVERY_NOTE, OrderLine, price_order
from main import FRAMEWORK, PACKAGED, app

RAW, STEEL = packaged_goods.load_steel()
client = TestClient(app)
CENT = Decimal("0.01")


def cents(v: Decimal) -> Decimal:
    return v.quantize(CENT, rounding=ROUND_HALF_UP)


def test_catalogue_shape_and_counts():
    by_cat = {}
    for p in RAW["products"]:
        by_cat[p["category_slug"]] = by_cat.get(p["category_slug"], 0) + 1
    assert by_cat == {"reinforcing-bar": 12, "mesh-brickforce": 10, "steel-fixing-accessories": 10, "structural-steel": 11}
    assert len({p["slug"] for p in RAW["products"]}) == len({p["sku"] for p in RAW["products"]}) == 43
    for p in RAW["products"]:
        assert len({u["unit"] for u in p["units"]}) == len(p["units"]), p["sku"]


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
            assert "lowest" in u["source_note"]
            priced += 1
    # Y8–Y16 6 m lengths, Ref 100 and 193 mesh, 150 mm brickforce, tie wire, 40x40x3 angle, 50x50x2 square tube.
    assert priced == 10


def test_rebar_mass_follows_sans_920():
    y12 = next(p for p in RAW["products"] if p["sku"] == "AA-STL-Y12")
    assert y12["mass_kg_per_m"] == 0.888
    six = next(u for u in y12["units"] if u["unit"] == "LENGTH_6M")
    assert six["weight_kg"] == 5.33


def test_storefront_copy_matches_the_pricing_service():
    web = Path(__file__).parents[3] / "apps" / "web" / "src" / "data" / "steel-catalogue.json"
    assert json.loads(web.read_text(encoding="utf-8")) == RAW


def test_steel_takes_its_own_family_with_4_percent_trade():
    result = packaged_goods.calculate(STEEL["AA-STL-Y12"], Decimal(10), "LENGTH_6M", "CONTRACTOR_TRADE")
    assert result.family == "STEEL"
    assert result.unit_price == Decimal("113.73")  # 118.47 x 0.96 = 113.7312; floor 109.69 x 1.03 = 112.98 not reached
    assert result.as_dict()["equivalent_tons"] == 0.053


def test_volume_steel_and_unbenchmarked_units_are_quoted():
    order = price_order(
        FRAMEWORK, [OrderLine("AA-STL-Y12", Decimal(10), "LENGTH_6M")], Decimal(20), "VOLUME_CIVIL_BULK", packaged=PACKAGED
    ).as_dict()
    assert order["is_quote_only"] and "TIER_QUOTE_ONLY" in order["reason_codes"]
    order = price_order(FRAMEWORK, [OrderLine("AA-STL-Y25", Decimal(2), "TONNE")], Decimal(20), "RETAIL", packaged=PACKAGED).as_dict()
    assert order["is_quote_only"] and order["reason_codes"] == ["PRICE_ON_REQUEST"]


def test_steel_only_order_needs_no_tipper_and_carries_the_flatbed_note():
    order = price_order(
        FRAMEWORK,
        [OrderLine("AA-STL-Y12", Decimal(20), "LENGTH_6M"), OrderLine("AA-STL-MESH-193", Decimal(4), "SHEET")],
        Decimal(20),
        "RETAIL",
        packaged=PACKAGED,
    ).as_dict()
    assert not order["is_quote_only"]
    assert order["delivery"]["fee"] == 0
    assert order["notes"] == [STEEL_DELIVERY_NOTE]
    assert order["subtotal"] == 4615.36  # 20 x 118.47 + 4 x 561.49


def test_endpoints_list_and_price_steel():
    assert len(client.get("/products/steel").json()) == 43
    body = client.post("/calculate/packaged-goods", json={"sku": "AA-STL-MESH-100", "quantity": 3, "unit": "SHEET"}).json()
    assert body["total"] == 1020.6
    assert client.post("/calculate/packaged-goods", json={"sku": "AA-STL-Y12", "quantity": 1, "unit": "BAG_50KG"}).status_code == 422
    body = client.post("/calculate/order", json={"lines": [{"sku": "AA-STL-ACC-TIE-WIRE", "quantity": 2, "unit": "COIL"}], "distance_km": 10}).json()
    assert body["total"] == 388.58
