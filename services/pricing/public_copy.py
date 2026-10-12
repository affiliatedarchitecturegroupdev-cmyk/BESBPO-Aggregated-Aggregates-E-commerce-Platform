"""
The storefront's copy of a pricing catalogue, with internal pricing research
removed (PRICING_POLICY.md, "Internal pricing research stays internal").

The web app's JSON is bundled into pages every visitor downloads, so it must
not carry competitor names or prices, benchmark prices, costs or cost bases.
scripts/public-catalogues.py writes the copies; the pricing tests compare
against them through here.
"""
import json

# Catalogue file in services/pricing/data -> its copy in apps/web/src/data.
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


def _strip(value):
    if isinstance(value, dict):
        return {k: _strip(v) for k, v in value.items() if k not in PRIVATE}
    if isinstance(value, list):
        return [_strip(v) for v in value]
    return value


def public_copy(src: str, data: dict) -> dict:
    """The public version of the catalogue `src` (a file name from PAIRS)."""
    out = _strip(data)
    if src == "pricing_framework.json":
        # The storefront never uses the category cost/markup bands.
        for category in out.get("categories", []):
            category.pop("markup", None)
    return out


def render(src: str, data: dict) -> str:
    """The public copy as written to disk — the layout each file has always had, so a re-run only shows real changes."""
    indent = 2 if src == "pricing_framework.json" else 1
    return json.dumps(public_copy(src, data), indent=indent, ensure_ascii=False) + "\n"
