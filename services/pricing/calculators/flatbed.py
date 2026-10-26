"""
Flatbed delivery fees (ROADMAP 9.2, docs/delivery-rates.md).

Steel, bricks and precast, roofing and timber, and building supplies travel on the supplier's own flatbed or
crane truck, never in the tipper bands. Until the owner sets a line's rates in Admin → Delivery rates, the
charge for that truck is confirmed with the customer before dispatch (R0 at checkout). Once set, the fee is
shown at checkout: one fee per distance band — the same bands as tipper loads — and free when that line's
goods come to at least `free_from`. Beyond the last band, delivery is quoted.

The delivery fee covers one supply point (docs/delivery-premium.md): when an order needs several lines'
trucks, the fee is the highest of them and the Distributed Delivery Premium covers the other collections.
"""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Optional

from calculators.delivery_bands import DeliveryRules

FLATBED_LINES = ("steel", "masonry", "roofing", "supplies")
FLATBED_OUT_OF_RANGE = "FLATBED_OUT_OF_RANGE"


@dataclass(frozen=True)
class FlatbedRate:
    fees: tuple[Decimal, ...]  # one per delivery band, in the bands' order
    free_from: Optional[Decimal] = None  # this line's goods at or above this subtotal deliver free


def flatbed_fee(rate: FlatbedRate, rules: DeliveryRules, distance_km: Decimal, line_subtotal: Decimal) -> Optional[Decimal]:
    """The fee for one line's truck, or None when the distance is beyond the bands (quoted)."""
    if distance_km > rules.quote_over_km:
        return None
    for band, fee in zip(rules.bands, rate.fees):
        if band.min_km <= distance_km <= band.max_km:
            return Decimal(0) if rate.free_from is not None and line_subtotal >= rate.free_from else fee
    return None
