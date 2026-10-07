#!/usr/bin/env python3
"""
Load partners' written rate cards into the plant-hire and site-services
catalogue (PLANT_HIRE_CATALOGUE.md, PRICING_POLICY.md).

    python services/pricing/ratecards/load_rate_cards.py <rate_cards.csv> [--dry-run]

One CSV row per partner x province x SKU (rate_card_template.csv). Rules:

- Every row needs a source_document (the signed quote or rate card) —
  no undocumented rates.
- Rates marked vat_included are divided by 1.15, so stored rates are ex-VAT.
- A SKU in a province is "Ready — benchmarked" (priced on the site) only with
  at least two distinct partners' cards; one card is "Provisional" (still
  quoted); none stays quote-only.
- The published partner rate is the MEDIAN of the partners' rates — an
  assumption; change BENCHMARK if finance prefers another rule.
- Monthly / long-term hire are never loaded: they are always quoted.

Writes "rates" into services/pricing/data/plant_services_catalogue.json and
its storefront copy. Re-running with a new CSV replaces every rate.
"""
from __future__ import annotations

import csv
import json
import statistics
import sys
from collections import defaultdict
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[2]
CATALOGUE = HERE.parent / "data" / "plant_services_catalogue.json"
WEB_COPY = REPO_ROOT / "apps" / "web" / "src" / "data" / "plant-services-catalogue.json"
BENCHMARK = statistics.median
READY, PROVISIONAL = "Ready — benchmarked", "Provisional — confirm w/ supplier"
RATE_FIELDS = {"plant": ("day_rate", "week_rate", "excess_hour_rate"), "service": ("service_rate",)}


def cents(value: float) -> float:
    return float(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def amount(value: str | None, vat_included: bool) -> float | None:
    value = (value or "").strip().replace(" ", "").replace(",", "").lstrip("Rr")
    if not value:
        return None
    number = float(value)
    if number <= 0:
        raise ValueError(f"rate must be positive, got {value}")
    return number / 1.15 if vat_included else number


def build_rates(data: dict, rows: list[dict]) -> tuple[dict, list[str]]:
    plant = {p["sku"] for p in data["plant"]}
    services = {s["sku"] for s in data["services"]}
    quoted_services = {s["sku"] for s in data["services"] if s["unit"] == "QUOTE"}
    cards: dict[tuple[str, str], dict[str, list[tuple[str, float]]]] = defaultdict(lambda: defaultdict(list))
    errors: list[str] = []
    for line, row in enumerate(rows, start=2):
        sku, region, partner = row.get("sku", "").strip(), row.get("region", "").strip(), row.get("partner", "").strip()
        if sku not in plant | services:
            errors.append(f"line {line}: unknown SKU {sku!r}")
            continue
        if sku in quoted_services:
            errors.append(f"line {line}: {sku} is always quoted — no rate is loaded for it")
            continue
        if region not in data["regions"]:
            errors.append(f"line {line}: region must be a province ({', '.join(data['regions'])}), got {region!r}")
            continue
        if not partner:
            errors.append(f"line {line}: partner is required")
            continue
        if not row.get("source_document", "").strip():
            errors.append(f"line {line}: source_document is required (no undocumented rates)")
            continue
        vat_included = row.get("vat_included", "").strip().lower() in ("true", "yes", "1", "y")
        fields = RATE_FIELDS["plant" if sku in plant else "service"]
        try:
            values = {f: amount(row.get(f), vat_included) for f in fields}
        except ValueError as exc:
            errors.append(f"line {line}: {exc}")
            continue
        if all(v is None for v in values.values()):
            errors.append(f"line {line}: no rate given")
            continue
        for f, v in values.items():
            if v is not None:
                cards[(sku, region)][f].append((partner, v))

    minimum = data["min_partner_cards"]
    rates: dict[str, dict[str, dict]] = {}
    for (sku, region), fields in sorted(cards.items()):
        def bench(field: str) -> tuple[float | None, int]:
            values = fields.get(field, [])
            return (cents(BENCHMARK([v for _, v in values])), len({p for p, _ in values})) if values else (None, 0)

        if sku in plant:
            day, n_day = bench("day_rate")
            week, n_week = bench("week_rate")
            excess, _ = bench("excess_hour_rate")
            partners = max(n_day, n_week)
            entry = {"partner_day_rate": day, "partner_week_rate": week, "partner_excess_hour_rate": excess}
        else:
            rate, partners = bench("service_rate")
            entry = {"partner_rate": rate}
        entry.update(pricing_status=READY if partners >= minimum else PROVISIONAL, cards=partners)
        rates.setdefault(sku, {})[region] = entry
    return rates, errors


def main(argv: list[str]) -> int:
    args = [a for a in argv if not a.startswith("--")]
    if not args:
        print(__doc__)
        return 2
    with open(args[0], newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    data = json.loads(CATALOGUE.read_text(encoding="utf-8"))
    rates, errors = build_rates(data, rows)
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    ready = sum(1 for r in rates.values() for v in r.values() if v["pricing_status"] == READY)
    provisional = sum(1 for r in rates.values() for v in r.values() if v["pricing_status"] == PROVISIONAL)
    print(f"{len(rates)} SKUs: {ready} SKU-province pairs priced, {provisional} provisional (need a second partner's card)")
    if "--dry-run" in argv:
        return 0
    data["rates"] = rates
    text = json.dumps(data, indent=1, ensure_ascii=False) + "\n"
    CATALOGUE.write_text(text, encoding="utf-8")
    WEB_COPY.write_text(text, encoding="utf-8")
    print(f"wrote {CATALOGUE.relative_to(REPO_ROOT)} and {WEB_COPY.relative_to(REPO_ROOT)} — redeploy to publish")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
