"""
Distance-banded delivery calculator.

Reads the Delivery & Additional Charges band structure directly: 0-30km
from the nearest approved partner-supplier location is included, 30-60km
and 60-100km carry flat add-ons banded by load size, and anything beyond
100km — or any Volume/Civil Bulk tier order (>=10m3) — routes to the RFQ
flow rather than showing a checkout price the business hasn't quoted.
Mirrors Module 2 of the platform spec.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Optional

LoadSize = Literal["M3_6", "M3_10", "M3_14_PLUS"]

VOLUME_CIVIL_BULK_THRESHOLD_M3 = 10.0


@dataclass
class DeliveryQuoteResult:
    is_quote_only: bool
    reason: Optional[str]
    distance_km: float
    load_size: Optional[LoadSize]
    fee: Optional[float]


def load_size_for_quantity_m3(quantity_m3: float) -> LoadSize:
    if quantity_m3 <= 6:
        return "M3_6"
    if quantity_m3 <= 10:
        return "M3_10"
    return "M3_14_PLUS"


def calculate_delivery_fee(
    distance_km: float,
    quantity_m3: float,
    bands: list[dict],
) -> DeliveryQuoteResult:
    # Volume/Civil Bulk tier orders are quote-only regardless of distance —
    # enforce this server-side, not just as a UI nicety (AGENTIC_RULES.md rule 3).
    if quantity_m3 >= VOLUME_CIVIL_BULK_THRESHOLD_M3:
        return DeliveryQuoteResult(
            is_quote_only=True,
            reason="Volume/Civil Bulk tier order (>=10m3) — routed to RFQ.",
            distance_km=distance_km,
            load_size=None,
            fee=None,
        )

    if distance_km > 100:
        return DeliveryQuoteResult(
            is_quote_only=True,
            reason="Delivery beyond 100km — routed to RFQ for individual quoting.",
            distance_km=distance_km,
            load_size=None,
            fee=None,
        )

    load_size = load_size_for_quantity_m3(quantity_m3)

    for band in bands:
        if band["is_quote_only"]:
            continue
        min_km = band["min_km"]
        max_km = band["max_km"]
        if max_km is None:
            continue
        if not (min_km <= distance_km <= max_km):
            continue
        # The 0-30km included band has no load_size (applies to every load).
        if band["load_size"] is not None and band["load_size"] != load_size:
            continue
        return DeliveryQuoteResult(
            is_quote_only=False,
            reason=None,
            distance_km=distance_km,
            load_size=load_size,
            fee=float(band["flat_fee"]),
        )

    # No matching band found — fail safe to a quote rather than guess a fee.
    return DeliveryQuoteResult(
        is_quote_only=True,
        reason="No matching delivery band found — routed to RFQ.",
        distance_km=distance_km,
        load_size=load_size,
        fee=None,
    )
