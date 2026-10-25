"""Products staff add in Admin → Catalogue import (docs/catalogue-import.md): quote-only until a supplier price is approved."""
import sys
from decimal import Decimal
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent.parent))

from calculators import packaged_goods  # noqa: E402
from main import PACKAGED, app  # noqa: E402

client = TestClient(app)
NEW = {"sku": "AA-GAR-SHADE-NET-80-3X50", "name": "Shade net 80% 3 × 50 m", "category_slug": "garden-tools-irrigation", "line": "supplies", "units": [{"unit": "ROLL", "label": "× roll"}]}


def order(added=None, overrides=None, tier="RETAIL", sku=NEW["sku"], unit="ROLL"):
    return client.post(
        "/calculate/order",
        json={"lines": [{"sku": sku, "quantity": 2, "unit": unit}], "distance_km": 10, "customer_tier": tier, "added_products": added or [], "price_overrides": overrides or []},
    )


def test_an_added_product_is_unknown_unless_the_api_sends_it():
    assert order().status_code == 404


def test_an_added_product_is_quote_only_until_a_supplier_price_is_approved():
    body = order([NEW]).json()
    assert body["is_quote_only"] is True
    priced = order([NEW], [{"sku": NEW["sku"], "unit": "ROLL", "list_price": 1080, "markup_percent": 8}]).json()
    assert priced["is_quote_only"] is False
    line = priced["lines"][0]
    assert line["unit_price"] == 1080.0 and line["total"] == 2160.0 and line["family"] == "SUPPLIES"
    assert line["unit_cost"] == 1000.0
    # Trade takes the supplies line's 4%; building supplies travel with the merchant, never in the tipper bands.
    assert order([NEW], [{"sku": NEW["sku"], "unit": "ROLL", "list_price": 1080, "markup_percent": 8}], "CONTRACTOR_TRADE").json()["lines"][0]["unit_price"] == 1036.8
    assert priced["delivery"]["fee"] == 0


def test_the_line_sets_the_family_and_the_units_allowed():
    steel = {**NEW, "sku": "AA-STL-NEW-1", "category_slug": "structural-steel", "line": "steel", "units": [{"unit": "LENGTH_6M", "label": "× 6 m length"}]}
    body = order([steel], [{"sku": "AA-STL-NEW-1", "unit": "LENGTH_6M", "list_price": 500, "markup_percent": 8}], sku="AA-STL-NEW-1", unit="LENGTH_6M").json()
    assert body["lines"][0]["family"] == "STEEL"
    bad = {**NEW, "units": [{"unit": "THOUSAND", "label": "× 1,000"}]}
    assert order([bad], unit="THOUSAND").status_code == 422
    assert order([{**NEW, "line": "aggregates"}]).status_code == 422


def test_the_files_win_and_the_loaded_catalogue_is_never_changed():
    existing = "AA-TMB-POLE-CCA-5075-1-8"
    patched = packaged_goods.with_added(PACKAGED, [packaged_goods.AddedProduct(existing, "Renamed", "x", "supplies", (("ROLL", "× roll"),))])
    assert patched[existing] is PACKAGED[existing]
    added = packaged_goods.with_added(PACKAGED, [packaged_goods.AddedProduct("AA-NEW-1", "New", "x", "supplies", (("EACH", "× item"),))])
    assert "AA-NEW-1" in added and "AA-NEW-1" not in PACKAGED
    assert added["AA-NEW-1"].units["EACH"].list_price is None and not added["AA-NEW-1"].units["EACH"].is_priced
    assert Decimal("0.08") == added["AA-NEW-1"].units["EACH"].markup


def test_validation():
    assert order([{**NEW, "sku": "bad sku"}]).status_code == 422
    assert order([{**NEW, "units": []}]).status_code == 422
