"""Range expansion (CAT-57 onwards, docs/pricing/RANGE_EXPANSION.md): quote-only products in the building-supplies line."""
import json
from decimal import Decimal
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from calculators import packaged_goods
from calculators.packaged_goods import PricingNotAvailable
from main import app
from public_copy import public_copy, range_index

DATA = Path(__file__).resolve().parents[1] / "data"
WEB = Path(__file__).resolve().parents[3] / "apps" / "web" / "src" / "data"
RAW, RANGE = packaged_goods.load_range()
client = TestClient(app)


def test_range_scale_and_codes():
    assert len(RAW["products"]) >= 2500
    codes = [int(c["code"].split("-")[1]) for c in RAW["categories"]]
    assert codes == sorted(codes) and codes[0] == 57 and len(set(codes)) == len(codes)
    # Every category says what it's for and how to handle it, once.
    assert all(c["typical_uses"] and c["handling_notes"] and c["department"] for c in RAW["categories"])


def test_skus_and_slugs_are_unique_across_every_catalogue():
    other = [json.loads((DATA / f).read_text(encoding="utf-8")) for f in ("b2b_packaged_catalogue.json", "steel_catalogue.json", "masonry_catalogue.json", "roofing_catalogue.json", "supplies_catalogue.json")]
    skus = [p["sku"] for c in other for p in c["products"]]
    slugs = [p["slug"] for c in other for p in c["products"]]
    assert not set(RANGE) & set(skus)
    assert not {p["slug"] for p in RAW["products"]} & set(slugs)
    assert len({p["slug"] for p in RAW["products"]}) == len(RAW["products"])


def test_every_unit_is_quote_only_until_benchmarked():
    for product in RANGE.values():
        assert product.line == "supplies" and product.own_transport
        for unit in product.units.values():
            assert unit.list_price is None and not unit.is_priced
            assert unit.unit in packaged_goods.SUPPLIES_UNITS


def test_quote_only_unit_is_not_priced():
    product = RANGE["AA-GDN-LAWN-KIKUYU"]
    assert set(product.units) == {"SQUARE_METRE", "PACK"}
    with pytest.raises(PricingNotAvailable):
        packaged_goods.calculate(product, Decimal(50), "SQUARE_METRE", "RETAIL")


def test_range_is_served_and_quoted_through_the_api():
    listed = client.get("/products/range").json()
    assert len(listed) == len(RAW["products"])
    response = client.post("/calculate/packaged-goods", json={"sku": "AA-TMB-GLULAM-90-315", "quantity": 12, "unit": "LINEAR_METRE", "customer_tier": "RETAIL"})
    # Known SKU and unit, but quote-only: 422, so the caller routes it to a quote — never a made-up price.
    assert response.status_code == 422


def test_storefront_copies_match():
    web = json.loads((WEB / "range-catalogue.json").read_text(encoding="utf-8"))
    assert web == public_copy("range_catalogue.json", RAW)
    assert "source_note" not in json.dumps(web["products"])
    index = json.loads((WEB / "range-index.json").read_text(encoding="utf-8"))
    assert index == range_index(RAW)
    assert all("description" not in p for p in index["products"])
