"""
Copies the pricing service's catalogues into the storefront with internal
pricing research removed (PRICING_POLICY.md, "What the public sees").

The web app's JSON is bundled into pages that every visitor downloads, so it
must not carry competitor names or prices, benchmark prices, costs or cost
bases. Those stay in services/pricing/data, which only the API can reach.

    python3 scripts/public-catalogues.py

Run it whenever a catalogue in services/pricing/data changes.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAIRS = {
    "b2b_packaged_catalogue.json": "b2b-packaged-catalogue.json",
    "ready_mix_catalogue.json": "ready-mix-catalogue.json",
    "steel_catalogue.json": "steel-catalogue.json",
    "masonry_catalogue.json": "masonry-catalogue.json",
    "roofing_catalogue.json": "roofing-catalogue.json",
    "pricing_framework.json": "pricing-framework.json",
}
# Internal: competitor names and prices, benchmark prices, costs and cost bases.
PRIVATE = {"source_note", "market_benchmark_price", "cost_basis_percent", "cost_per_unit", "base_cost_per_ton", "benchmark_sources"}


def strip(value):
    if isinstance(value, dict):
        return {k: strip(v) for k, v in value.items() if k not in PRIVATE}
    if isinstance(value, list):
        return [strip(v) for v in value]
    return value


def main():
    for src, dest in PAIRS.items():
        data = json.loads((ROOT / "services/pricing/data" / src).read_text())
        data = strip(data)
        if src == "pricing_framework.json":
            # The storefront never uses the category cost/markup bands.
            for category in data.get("categories", []):
                category.pop("markup", None)
        out = ROOT / "apps/web/src/data" / dest
        # Same layout as before, so a re-run only shows real changes.
        indent = 2 if src == "pricing_framework.json" else 1
        out.write_text(json.dumps(data, indent=indent, ensure_ascii=False) + "\n")
        print(f"wrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
