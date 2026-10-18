"""Range depth (docs/pricing/RANGE_DEPTH.md): the added sizes and types are quote-only and unique."""
import json
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "data"
FILES = ["masonry", "supplies", "roofing", "steel", "b2b_packaged"]
CATS = {f: json.loads((DATA / f"{f}_catalogue.json").read_text(encoding="utf-8")) for f in FILES}
OWNED = "range-depth-2026-10"


def added(name):
    return [p for p in CATS[name]["products"] if p.get("_range") == OWNED]


def test_counts():
    assert {f: len(added(f)) for f in FILES} == {"masonry": 164, "supplies": 394, "roofing": 41, "steel": 108, "b2b_packaged": 20}


def test_every_added_unit_is_quote_only():
    for f in FILES:
        for p in added(f):
            for u in p["units"]:
                assert u["pricing_status"].startswith("Quote-only"), p["sku"]
                assert u.get("list_price_per_unit") is None and u.get("market_benchmark_price") is None, p["sku"]


def test_skus_and_slugs_unique_across_catalogues():
    skus = [p["sku"] for f in FILES for p in CATS[f]["products"]]
    slugs = [p["slug"] for f in FILES for p in CATS[f]["products"]]
    assert len(skus) == len(set(skus)) and len(slugs) == len(set(slugs))


def test_lintels_run_to_six_point_six_metres_in_three_widths():
    names = [p["name"] for p in CATS["masonry"]["products"] if "lintel" in p["name"].lower()]
    assert any("6.6 m" in n for n in names)
    assert any("140" in n for n in names) and any("150" in n for n in names)
