"""
Sanity tests for the two calculators. These check internal consistency
(round-trip conversions, band coverage) — they are not a substitute for
reconciling against the real pricing engine xlsx (roadmap Phase 5).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from calculators.delivery_bands import calculate_delivery_fee, load_size_for_quantity_m3
from calculators.tonnage_volume import (
    BaggedUnitUnavailable,
    ProductPricing,
    calculate,
    m3_to_tons,
    price_per_bag,
    price_per_m3,
    tons_to_m3,
)

DOLOMITE = ProductPricing(
    sku="AA-CRS-19MM-DOL",
    name="19mm Crushed Stone (Dolomite)",
    bulk_density_kg_per_m3=1450,
    list_price_per_ton=400.00,
    bag_premium_multiplier=1.4725,
    bag_weight_kg=20,
)

RAIL_BALLAST = ProductPricing(
    sku="AA-BAL-RAIL-001",
    name="Rail Ballast",
    bulk_density_kg_per_m3=1350,
    list_price_per_ton=364.00,
    bag_premium_multiplier=None,
    bag_weight_kg=None,
)

SAMPLE_BANDS = [
    {"label": "INCLUDED_0_30", "load_size": None, "min_km": 0, "max_km": 30, "flat_fee": 0, "is_quote_only": False},
    {"label": "BAND_30_60", "load_size": "M3_6", "min_km": 30, "max_km": 60, "flat_fee": 450, "is_quote_only": False},
    {"label": "BAND_60_100", "load_size": "M3_6", "min_km": 60, "max_km": 100, "flat_fee": 750, "is_quote_only": False},
    {"label": "QUOTE_100_PLUS", "load_size": None, "min_km": 100, "max_km": None, "flat_fee": None, "is_quote_only": True},
]


def test_tons_m3_roundtrip():
    tons = 14.5
    m3 = tons_to_m3(tons, DOLOMITE.bulk_density_kg_per_m3)
    back_to_tons = m3_to_tons(m3, DOLOMITE.bulk_density_kg_per_m3)
    assert round(back_to_tons, 6) == tons


def test_price_per_m3_matches_wireframe_sample():
    # Product-detail wireframe shows R400.00/ton -> R580.00/m3 for this SKU.
    assert price_per_m3(DOLOMITE) == 580.0


def test_price_per_bag_matches_wireframe_sample():
    # Product-detail wireframe shows R11.78/20kg bag for this SKU.
    assert price_per_bag(DOLOMITE) == 11.78


def test_bagged_unit_unavailable_for_bulk_only_product():
    try:
        price_per_bag(RAIL_BALLAST)
        assert False, "expected BaggedUnitUnavailable"
    except BaggedUnitUnavailable:
        pass


def test_calculate_applies_trade_discount():
    result = calculate(DOLOMITE, quantity=10, unit="ton", discount_percent=8)
    assert result["subtotal_before_discount"] == 4000.0
    assert result["total"] == 3680.0


def test_delivery_included_band():
    result = calculate_delivery_fee(distance_km=15, quantity_m3=4, bands=SAMPLE_BANDS)
    assert result.is_quote_only is False
    assert result.fee == 0


def test_delivery_beyond_100km_is_quote_only():
    result = calculate_delivery_fee(distance_km=140, quantity_m3=4, bands=SAMPLE_BANDS)
    assert result.is_quote_only is True


def test_volume_civil_bulk_always_quote_only_regardless_of_distance():
    result = calculate_delivery_fee(distance_km=10, quantity_m3=12, bands=SAMPLE_BANDS)
    assert result.is_quote_only is True
    assert "Volume/Civil Bulk" in result.reason


def test_load_size_bucketing():
    assert load_size_for_quantity_m3(5) == "M3_6"
    assert load_size_for_quantity_m3(9) == "M3_10"
    assert load_size_for_quantity_m3(13) == "M3_14_PLUS"
