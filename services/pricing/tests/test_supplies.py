"""CAT-32..56 building supplies (with the services & fit-out departments, CAT-43..56): priced like packaged goods in the SUPPLIES family, live only where two retailers list the same product."""
from decimal import ROUND_HALF_UP, Decimal

from fastapi.testclient import TestClient

from calculators import packaged_goods
from calculators.discount_floor import SUPPLIES
from calculators.order import SUPPLIES_DELIVERY_NOTE, OrderLine, price_order
from main import FRAMEWORK, PACKAGED, app

RAW, SUPPLIES_PRODUCTS = packaged_goods.load_supplies()
client = TestClient(app)


def test_catalogue_shape():
    codes = [c["code"] for c in RAW["categories"]]
    assert codes == [f"CAT-{n}" for n in range(32, 57)]
    cats = {c["slug"] for c in RAW["categories"]}
    assert {p["category_slug"] for p in RAW["products"]} == cats
    assert len({p["slug"] for p in RAW["products"]}) == len({p["sku"] for p in RAW["products"]}) == len(RAW["products"])
    # SKUs never collide with another line's.
    assert not set(SUPPLIES_PRODUCTS) & (set(PACKAGED) - set(SUPPLIES_PRODUCTS))


def test_priced_units_are_lowest_regular_price_times_1_08():
    priced = 0
    for p in RAW["products"]:
        for u in p["units"]:
            if u["pricing_status"] == packaged_goods.READY_STATUS:
                priced += 1
                bench = Decimal(str(u["market_benchmark_price"]))
                assert Decimal(str(u["list_price_per_unit"])) == (bench * Decimal("1.08")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP), p["sku"]
                # Two retailers back every live price.
                assert "Cashbuild" in u["source_note"] and "Builders" in u["source_note"], p["sku"]
            else:
                assert u["list_price_per_unit"] is None and u["market_benchmark_price"] is None, p["sku"]
    assert priced >= 40


def test_trade_gets_4_percent_and_volume_is_quoted():
    product = SUPPLIES_PRODUCTS["AA-CLG-RHINO-64-1200-3000"]
    assert packaged_goods.family_for(product, "SHEET") == SUPPLIES
    retail = packaged_goods.calculate(product, Decimal(10), "SHEET", "RETAIL")
    trade = packaged_goods.calculate(product, Decimal(10), "SHEET", "CONTRACTOR_TRADE")
    assert retail.unit_price == Decimal("225.72")
    assert trade.unit_price == Decimal("216.69")
    volume = packaged_goods.calculate(product, Decimal(10), "SHEET", "VOLUME_CIVIL_BULK", allow_unpriced=True)
    assert volume.pricing_status == packaged_goods.TIER_QUOTE_STATUS


def test_orders_travel_on_the_merchants_vehicle_with_no_tipper_fee():
    order = price_order(
        FRAMEWORK,
        [OrderLine("AA-FEN-YSTD-1850", Decimal(20), "EACH"), OrderLine("AA-PNT-DUR-MATT-20-W", Decimal(2), "EACH")],
        Decimal(25),
        "RETAIL",
        packaged=PACKAGED,
    ).as_dict()
    assert SUPPLIES_DELIVERY_NOTE in order["notes"]
    assert not order["is_quote_only"]
    assert Decimal(str(order["delivery"]["fee"])) == 0
    assert Decimal(str(order["subtotal"])) == Decimal("20") * Decimal("156.55") + Decimal("2") * Decimal("863.95")


def test_quoted_items_go_to_a_quote_and_the_endpoint_lists_the_line():
    order = price_order(FRAMEWORK, [OrderLine("AA-DOR-HC-813", Decimal(3), "EACH")], Decimal(10), "RETAIL", packaged=PACKAGED).as_dict()
    assert order["is_quote_only"] and order["reason_codes"] == ["PRICE_ON_REQUEST"]
    response = client.get("/products/supplies")
    assert response.status_code == 200 and len(response.json()) == len(RAW["products"])
