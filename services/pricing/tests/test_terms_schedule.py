"""The Terms & Conditions discount table must say what the pricing code does.

content/legal/terms-and-conditions.md §2 lists the trade-tier discounts per
product type. If SCHEDULE in calculators/discount_floor.py changes, this test
fails until the public terms are updated too (and re-reviewed — see
content/legal/README.md).
"""
from decimal import Decimal
from pathlib import Path

from calculators.discount_floor import AGGREGATE, CEMENT_BAGGED, CEMENT_BULK, READY_MIX, SCHEDULE

TERMS = Path(__file__).resolve().parents[3] / "content" / "legal" / "terms-and-conditions.md"

ROWS = {
    "Aggregates": AGGREGATE,
    "Bagged cement and mortar": CEMENT_BAGGED,
    "Bulk cement (bulk bags, tankers) and admixtures in drums or totes": CEMENT_BULK,
    "Ready-mix concrete": READY_MIX,
}


def expected(discount, capped_wording):
    if discount is None:
        return "quoted"
    pct = f"{(discount * 100).normalize():f}%"
    return f"up to {pct}" if capped_wording else pct


def test_terms_table_matches_the_discount_schedule():
    table = {}
    for line in TERMS.read_text(encoding="utf-8").splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) == 3 and cells[0] in ROWS:
            table[cells[0]] = (cells[1], cells[2])
    assert set(table) == set(ROWS), "every product type must have a row in the Terms"
    for label, family in ROWS.items():
        trade, volume = table[label]
        assert trade == expected(SCHEDULE[family]["CONTRACTOR_TRADE"], False), label
        # Volume discounts can be capped by the floor, so the terms say "up to".
        assert volume == expected(SCHEDULE[family]["VOLUME_CIVIL_BULK"], True), label
    assert SCHEDULE[AGGREGATE]["RETAIL"] == Decimal(0)
