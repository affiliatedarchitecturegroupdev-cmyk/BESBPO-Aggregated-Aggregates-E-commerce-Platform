"""
Floor-based tier discounting (approved Oct 2026 — PRICING_POLICY.md).

A tier discount may never push a price below the SKU's floor:

    cost  = list / (1 + markup)
    floor = cost x (1 + MIN_MARGIN)          # MIN_MARGIN = 3%, finance to confirm
    tier price = max(list x (1 - tier discount), floor)

What each tier may self-serve depends on the product family:

    family          Retail   Contractor/Trade   Volume/Civil Bulk
    AGGREGATE       list     8%                 15% (floor-capped)
    CEMENT_BAGGED   list     4%                 quote only
    CEMENT_BULK     list     quote only         quote only
    READY_MIX       list     2%                 quote only

"Quote only" means the tier has no self-serve price for that family: the
order goes to a quote. Card/gateway fees (~3%) are not netted off yet.
apps/web/src/lib/tier-pricing.ts mirrors this module exactly.
"""
from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from typing import Optional

MIN_MARGIN = Decimal("0.03")
# The AA storefront markup on a retail benchmark (cement, ready-mix).
STOREFRONT_MARKUP = Decimal("0.08")

AGGREGATE = "AGGREGATE"
CEMENT_BAGGED = "CEMENT_BAGGED"
CEMENT_BULK = "CEMENT_BULK"
READY_MIX = "READY_MIX"
FAMILIES = (AGGREGATE, CEMENT_BAGGED, CEMENT_BULK, READY_MIX)

# Discount per tier as a fraction; None = no self-serve price (quote it).
SCHEDULE: dict[str, dict[str, Optional[Decimal]]] = {
    AGGREGATE: {"RETAIL": Decimal(0), "CONTRACTOR_TRADE": Decimal("0.08"), "VOLUME_CIVIL_BULK": Decimal("0.15")},
    CEMENT_BAGGED: {"RETAIL": Decimal(0), "CONTRACTOR_TRADE": Decimal("0.04"), "VOLUME_CIVIL_BULK": None},
    CEMENT_BULK: {"RETAIL": Decimal(0), "CONTRACTOR_TRADE": None, "VOLUME_CIVIL_BULK": None},
    READY_MIX: {"RETAIL": Decimal(0), "CONTRACTOR_TRADE": Decimal("0.02"), "VOLUME_CIVIL_BULK": None},
}

CENT = Decimal("0.01")


def _cents(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


class TierQuoteOnly(ValueError):
    """The customer's tier has no self-serve price for this product family."""


def scheduled_discount(family: str, tier: str) -> Optional[Decimal]:
    return SCHEDULE[family][tier]


def floor_price(list_price: Decimal, markup: Decimal) -> Decimal:
    """Cost plus the minimum margin, to the cent. `markup` is a fraction (0.18 = 18%)."""
    return _cents(list_price / (1 + markup) * (1 + MIN_MARGIN))


@dataclass(frozen=True)
class TierPrice:
    unit_price: Decimal
    discount: Decimal  # fraction actually applied
    scheduled_discount: Decimal
    capped_by_floor: bool


def tier_price(list_price: Decimal, markup: Decimal, family: str, tier: str) -> TierPrice:
    """
    The unit price at `tier`, rounded to the cent. `list_price` is the
    unrounded list price. Raises TierQuoteOnly when the tier has no
    self-serve price for the family.
    """
    scheduled = scheduled_discount(family, tier)
    if scheduled is None:
        raise TierQuoteOnly(f"{tier.replace('_', ' ').title()} pricing for this product is quoted individually.")
    wanted = _cents(list_price * (1 - scheduled))
    if scheduled == 0:
        return TierPrice(wanted, Decimal(0), Decimal(0), False)
    floor = floor_price(list_price, markup)
    price = max(wanted, floor)
    rounded_list = _cents(list_price)
    applied = (rounded_list - price) / rounded_list if rounded_list else Decimal(0)
    return TierPrice(price, applied, scheduled, price > wanted)
