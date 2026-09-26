"""
Behaviour tests for the calculators: unit conversion, units of sale, and
the delivery / quote-only rules from the Delivery & Additional Charges
sheet. Price levels themselves are checked against the workbook in
test_reconcile_workbook.py.
"""
import sys
from decimal import Decimal
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

import pricing_framework  # noqa: E402
from calculators.delivery_bands import calculate_delivery_fee, load_size_for_quantity_m3  # noqa: E402
from calculators.order import OrderLine, price_order  # noqa: E402
from calculators.tonnage_volume import UnitNotOffered, calculate, m3_to_tons, tons_to_m3  # noqa: E402

FRAMEWORK = pricing_framework.load()
RULES = FRAMEWORK.delivery
D = Decimal

G5_GRAVEL = FRAMEWORK.products["AA-SBC-05"]  # ton + m3
DOLOMITE_19MM = FRAMEWORK.products["AA-CRS-04"]  # ton only
RIVER_PEBBLE = FRAMEWORK.products["AA-DEC-01"]  # ton + 20kg bag
HYDRATED_LIME = FRAMEWORK.products["AA-AGR-03"]  # 25kg bag only
AG_LIME = FRAMEWORK.products["AA-AGR-01"]  # ton + 25kg bag
VOLUME_MIN = FRAMEWORK.tiers["VOLUME_CIVIL_BULK"].quote_only_min_m3


# --- tonnage / volume -------------------------------------------------------

def test_tons_m3_roundtrip():
    m3 = tons_to_m3(D("14.5"), G5_GRAVEL.bulk_density_kg_per_m3)
    assert m3_to_tons(m3, G5_GRAVEL.bulk_density_kg_per_m3) == D("14.5")


def test_line_total_is_quantity_times_tier_unit_price():
    result = calculate(G5_GRAVEL, D("7"), "ton", FRAMEWORK.tiers["CONTRACTOR_TRADE"].discount)
    assert result.list_unit_price == D("212.40")
    assert result.unit_price == D("195.41")  # 212.40 x 0.92 = 195.408
    assert result.total == D("1367.87")  # 7 x 195.41
    assert result.subtotal_before_discount == D("1486.80")


def test_half_cent_rounds_up_like_excel():
    # 945 x 2.2 x 25 / 1000 = 51.975 -> R51.98 (Excel ROUND), not banker's R51.97
    assert calculate(AG_LIME, D("1"), "bag").unit_price == D("51.98")


def test_bag_line_reports_weight_and_equivalents():
    result = calculate(RIVER_PEBBLE, D("50"), "bag")
    assert result.bagged_kg == D("1000")
    assert result.equivalent_tons == D("1")
    assert result.total == D("2061.50")  # 50 x 41.23


@pytest.mark.parametrize(
    "product, unit",
    [(DOLOMITE_19MM, "m3"), (DOLOMITE_19MM, "bag"), (G5_GRAVEL, "bag"), (HYDRATED_LIME, "ton")],
)
def test_units_not_offered_are_rejected(product, unit):
    with pytest.raises(UnitNotOffered):
        calculate(product, D("1"), unit)


def test_bags_must_be_whole():
    with pytest.raises(ValueError):
        calculate(RIVER_PEBBLE, D("2.5"), "bag")


# --- delivery ---------------------------------------------------------------

def test_load_size_bucketing():
    assert load_size_for_quantity_m3(D("6")) == "M3_6"
    assert load_size_for_quantity_m3(D("6.1")) == "M3_10"
    assert load_size_for_quantity_m3(D("10")) == "M3_10"
    assert load_size_for_quantity_m3(D("13")) == "M3_14_PLUS"


@pytest.mark.parametrize(
    "distance, m3, fee",
    [
        (0, 4, 0), (30, 4, 0),
        (30.1, 4, 450), (60, 8, 650), (45, 14, 950),
        (60.1, 5, 850), (100, 10, 1200), (80, 20, 1800),
    ],
)
def test_bulk_tipper_bands(distance, m3, fee):
    result = calculate_delivery_fee(RULES, distance_km=D(str(distance)), bulk_m3=D(str(m3)))
    assert result.is_quote_only is False
    assert result.fee == D(fee)


def test_beyond_100km_is_quote_only():
    result = calculate_delivery_fee(RULES, distance_km=D("100.5"), bulk_m3=D("4"))
    assert result.is_quote_only is True
    assert result.fee is None


def test_ten_m3_or_more_is_quote_only_for_volume_tier_only():
    volume = calculate_delivery_fee(RULES, distance_km=D("10"), bulk_m3=D("12"), quote_only_min_m3=VOLUME_MIN)
    assert volume.is_quote_only is True
    assert "Volume/Civil Bulk" in volume.reasons[0]

    retail = calculate_delivery_fee(RULES, distance_km=D("45"), bulk_m3=D("12"))
    assert retail.is_quote_only is False
    assert retail.load_size == "M3_14_PLUS"
    assert retail.fee == D("950")


def test_minimum_met_by_tons_when_m3_is_below_three():
    # 5 tons of 1800kg/m3 crusher run is ~2.8m3 — still a full tipper order.
    result = calculate_delivery_fee(RULES, distance_km=D("45"), bulk_m3=D("2.8"), bulk_tons=D("5"))
    assert result.components[0]["kind"] == "BULK_TIPPER"
    assert result.fee == D("450")


def test_below_minimum_is_small_load_within_30km_only():
    near = calculate_delivery_fee(RULES, distance_km=D("20"), bulk_m3=D("2"), bulk_tons=D("3"))
    assert near.fee == D("350")
    far = calculate_delivery_fee(RULES, distance_km=D("40"), bulk_m3=D("2"), bulk_tons=D("3"))
    assert far.is_quote_only is True


def test_bagged_fee_under_one_ton_free_from_one_ton():
    assert calculate_delivery_fee(RULES, distance_km=D("10"), bagged_kg=D("999")).fee == D("350")
    assert calculate_delivery_fee(RULES, distance_km=D("10"), bagged_kg=D("1000")).fee == D("0")
    assert calculate_delivery_fee(RULES, distance_km=D("31"), bagged_kg=D("500")).is_quote_only is True


def test_empty_delivery_is_rejected():
    with pytest.raises(ValueError):
        calculate_delivery_fee(RULES, distance_km=D("10"))


# --- whole orders -----------------------------------------------------------

def test_order_totals_lines_and_delivery():
    result = price_order(
        FRAMEWORK,
        [OrderLine("AA-SBC-05", D("8"), "m3"), OrderLine("AA-CRS-04", D("2"), "ton")],
        distance_km=D("50"),
        customer_tier="CONTRACTOR_TRADE",
    )
    assert result.is_quote_only is False
    assert result.subtotal == D("3393.52")  # 8 x 332.19 + 2 x 368.00
    assert result.delivery.load_size == "M3_10"  # 8m3 + 1.38m3
    assert result.delivery.fee == D("650")


def test_volume_threshold_counts_the_whole_order():
    lines = [OrderLine("AA-SBC-05", D("6"), "m3"), OrderLine("AA-SND-01", D("6"), "m3")]
    volume = price_order(FRAMEWORK, lines, distance_km=D("10"), customer_tier="VOLUME_CIVIL_BULK")
    assert volume.is_quote_only is True
    trade = price_order(FRAMEWORK, lines, distance_km=D("10"), customer_tier="CONTRACTOR_TRADE")
    assert trade.is_quote_only is False
