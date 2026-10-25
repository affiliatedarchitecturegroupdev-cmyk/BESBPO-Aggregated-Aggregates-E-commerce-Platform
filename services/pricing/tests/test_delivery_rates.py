"""Admin → Delivery rates (docs/delivery-rates.md): staff-set tipper rates and flatbed fees, sent with every price."""
import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app  # noqa: E402

client = TestClient(app)

WORKBOOK = {
    "band_fees": {"BAND_30_60": {"M3_6": 450, "M3_10": 650, "M3_14_PLUS": 950}, "BAND_60_100": {"M3_6": 850, "M3_10": 1200, "M3_14_PLUS": 1800}},
    "small_load_fee": 350,
    "bagged_fee": 350,
    "bagged_free_from_kg": 1000,
    "min_bulk_m3": 3,
    "min_bulk_tons": 5,
}
STEEL = {"sku": "AA-STL-Y08", "unit": "LENGTH_6M"}  # R56.70 a length
BRICKS = {"sku": "AA-MAS-CLAY-STOCK", "unit": "THOUSAND"}  # R2,559.60 per 1,000
SAND = {"sku": "AA-SBC-01", "unit": "m3"}


def order(lines, km=45, rates=None, tier="RETAIL"):
    body = {"lines": lines, "distance_km": km, "customer_tier": tier}
    if rates is not None:
        body["delivery_rates"] = rates
    return client.post("/calculate/order", json=body)


def test_the_workbook_rates_sent_back_price_exactly_as_before():
    lines = [{**SAND, "quantity": 6}]
    assert order(lines, rates=WORKBOOK).json() == order(lines).json()


def test_staff_rates_replace_the_workbook_fees_and_thresholds():
    rates = {**WORKBOOK, "band_fees": {"BAND_30_60": {"M3_6": 500, "M3_10": 700, "M3_14_PLUS": 1000}}, "small_load_fee": 400}
    assert order([{**SAND, "quantity": 6}], rates=rates).json()["delivery"]["fee"] == 500
    # A band staff didn't send keeps the workbook's fees.
    assert order([{**SAND, "quantity": 6}], km=80, rates=rates).json()["delivery"]["fee"] == 850
    assert order([{**SAND, "quantity": 1}], km=10, rates=rates).json()["delivery"]["fee"] == 400
    # Raise the full-load minimum: 4 m³ is now a small load.
    assert order([{**SAND, "quantity": 4}], km=10, rates={**WORKBOOK, "min_bulk_m3": 5, "min_bulk_tons": 8}).json()["delivery"]["components"][0]["kind"] == "SMALL_LOAD"
    # The delivery-fee endpoint takes them too.
    body = client.post("/calculate/delivery-fee", json={"distance_km": 45, "bulk_m3": 6, "delivery_rates": rates}).json()
    assert body["fee"] == 500


def test_flatbed_lines_ride_free_until_their_rates_are_set():
    body = order([{**STEEL, "quantity": 10}], rates=WORKBOOK).json()
    assert body["delivery"]["fee"] == 0
    assert any("confirm the delivery slot" in n for n in body["notes"])


def test_flatbed_fees_by_band_free_above_a_threshold_and_quoted_beyond():
    rates = {**WORKBOOK, "flatbed": {"steel": {"fees": [300, 550, 900], "free_from": 5000}}}
    near = order([{**STEEL, "quantity": 10}], km=10, rates=rates).json()
    assert near["delivery"]["fee"] == 300 and near["total"] == 567 + 300
    assert near["delivery"]["components"] == [{"kind": "FLATBED", "load_size": None, "line": "steel", "fee": 300.0}]
    assert any("the delivery fee covers it" in n for n in near["notes"])
    assert order([{**STEEL, "quantity": 10}], km=45, rates=rates).json()["delivery"]["fee"] == 550
    assert order([{**STEEL, "quantity": 10}], km=80, rates=rates).json()["delivery"]["fee"] == 900
    # R5,000 or more of steel delivers free.
    assert order([{**STEEL, "quantity": 100}], km=45, rates=rates).json()["delivery"]["fee"] == 0
    far = order([{**STEEL, "quantity": 10}], km=150, rates=rates).json()
    assert far["is_quote_only"] is True and far["reason_codes"] == ["FLATBED_OUT_OF_RANGE"]


def test_one_supply_point_the_highest_fee_and_lines_without_rates_stay_free():
    rates = {**WORKBOOK, "flatbed": {"steel": {"fees": [300, 550, 900]}, "masonry": {"fees": [650, 950, 1400]}}}
    both = order([{**STEEL, "quantity": 10}, {**BRICKS, "quantity": 2}], km=10, rates=rates).json()
    assert both["delivery"]["fee"] == 650
    assert [c["line"] for c in both["delivery"]["components"]] == ["masonry"]
    steel_only_rates = {**WORKBOOK, "flatbed": {"steel": {"fees": [300, 550, 900]}}}
    assert order([{**STEEL, "quantity": 10}, {**BRICKS, "quantity": 2}], km=10, rates=steel_only_rates).json()["delivery"]["fee"] == 300


def test_with_tipper_goods_the_tipper_fee_covers_the_delivery():
    rates = {**WORKBOOK, "flatbed": {"steel": {"fees": [300, 550, 900]}}}
    body = order([{**SAND, "quantity": 6}, {**STEEL, "quantity": 10}], km=45, rates=rates).json()
    assert body["delivery"]["fee"] == 450
    assert [c["kind"] for c in body["delivery"]["components"]] == ["BULK_TIPPER"]


def test_validation():
    assert order([{**SAND, "quantity": 6}], rates={**WORKBOOK, "small_load_fee": -1}).status_code == 422
    assert order([{**SAND, "quantity": 6}], rates={**WORKBOOK, "band_fees": {"INCLUDED_0_30": {"M3_6": 1}}}).status_code == 422
    assert order([{**SAND, "quantity": 6}], rates={**WORKBOOK, "band_fees": {"BAND_30_60": {"M3_6": -5}}}).status_code == 422
    assert order([{**SAND, "quantity": 6}], rates={**WORKBOOK, "flatbed": {"steel": {"fees": [1, 2]}}}).status_code == 422
    assert order([{**SAND, "quantity": 6}], rates={**WORKBOOK, "flatbed": {"steel": {"fees": [1, -2, 3]}}}).status_code == 422
    assert order([{**SAND, "quantity": 6}], rates={**WORKBOOK, "flatbed": {"ready-mix": {"fees": [1, 2, 3]}}}).status_code == 422
