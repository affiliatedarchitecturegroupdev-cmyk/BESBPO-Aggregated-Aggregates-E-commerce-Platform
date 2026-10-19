"""Services & fit-out (docs/pricing/FITOUT_CATALOGUE.md): electrical, tiles, bathroom, hardware and boards — all quote-only for now."""
import json
from pathlib import Path

RAW = json.loads((Path(__file__).resolve().parents[1] / "data" / "supplies_catalogue.json").read_text(encoding="utf-8"))
FITOUT = [p for p in RAW["products"] if p.get("_line") == "fitout-2026-10"]
CATS = {c["slug"]: c["code"] for c in RAW["categories"]}


def test_fourteen_categories_cat_43_to_56():
    codes = sorted(CATS[c] for c in {p["category_slug"] for p in FITOUT})
    assert codes == [f"CAT-{n}" for n in range(43, 57)]


def test_counts_by_category():
    counts = {}
    for p in FITOUT:
        counts[p["category_slug"]] = counts.get(p["category_slug"], 0) + 1
    assert len(FITOUT) == 279
    assert min(counts.values()) >= 13


def test_every_unit_is_quote_only_and_uses_a_supplies_unit():
    for p in FITOUT:
        assert p["manufacturer"] is None
        for u in p["units"]:
            assert u["unit"] in ("EACH", "PACK", "ROLL", "SHEET"), p["sku"]
            assert u["list_price_per_unit"] is None and u["market_benchmark_price"] is None, p["sku"]
            assert u["pricing_status"].startswith("Quote-only"), p["sku"]


def test_electrical_and_solar_carry_the_compliance_note():
    for p in FITOUT:
        if p["category_slug"].startswith("electrical") or p["category_slug"] in ("switches-sockets-lighting", "solar-backup-power"):
            assert "Certificate of Compliance" in p["handling_notes"], p["sku"]
