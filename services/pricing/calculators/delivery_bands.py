"""
Distance-banded delivery calculator.

Implements the Delivery & Additional Charges sheet of the pricing framework
workbook. Mirrors Module 2 of the platform spec:

- Bulk tipper loads that meet the minimum order (3m3 or 5 tons): 0-30km is
  included in the list price; 30-60km and 60-100km carry a flat fee banded
  by load size (6m3 / 10m3 / 14m3+ Interlink).
- Bulk orders below the minimum go as a small (bakkie/LDV) load: flat fee,
  within 30km only.
- Bagged/palletised orders: flat fee under 1 ton, free from 1 ton, within
  30km.
- Anything the sheet does not price routes to the RFQ flow instead of
  showing a number the business hasn't priced: delivery beyond 100km,
  Volume/Civil Bulk tier orders at or above the tier's m3 threshold, and
  small-load or bagged deliveries beyond 30km.

This is enforced here, server-side, not just in the storefront
(AGENTIC_RULES.md rule 3).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Literal, Optional

LoadSize = Literal["M3_6", "M3_10", "M3_14_PLUS"]

# Machine-readable counterparts of the human reasons, so callers (the RFQ
# flow) can classify a quote without parsing text.
VOLUME_THRESHOLD = "VOLUME_THRESHOLD"
OVER_MAX_DISTANCE = "OVER_MAX_DISTANCE"
SMALL_LOAD_OUT_OF_RANGE = "SMALL_LOAD_OUT_OF_RANGE"
BAGGED_OUT_OF_RANGE = "BAGGED_OUT_OF_RANGE"
NO_MATCHING_BAND = "NO_MATCHING_BAND"


@dataclass(frozen=True)
class DeliveryBand:
    label: str
    min_km: Decimal
    max_km: Decimal
    fees: dict[str, Decimal]  # LoadSize -> flat fee; empty for the included band


@dataclass(frozen=True)
class DeliveryRules:
    bands: tuple[DeliveryBand, ...]
    quote_over_km: Decimal
    min_bulk_m3: Decimal
    min_bulk_tons: Decimal
    small_load_fee: Decimal
    small_load_max_km: Decimal
    bagged_fee: Decimal
    bagged_max_km: Decimal
    bagged_free_from_kg: Decimal


@dataclass
class DeliveryQuoteResult:
    is_quote_only: bool
    reasons: list[str]
    distance_km: Decimal
    load_size: Optional[LoadSize]
    fee: Optional[Decimal]
    components: list[dict] = field(default_factory=list)
    reason_codes: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "is_quote_only": self.is_quote_only,
            "reason": "; ".join(self.reasons) if self.reasons else None,
            "reasons": self.reasons,
            "reason_codes": self.reason_codes,
            "distance_km": float(self.distance_km),
            "load_size": self.load_size,
            "fee": None if self.fee is None else float(self.fee),
            "components": [
                {**c, "fee": float(c["fee"])} for c in self.components
            ],
        }


def load_size_for_quantity_m3(quantity_m3: Decimal) -> LoadSize:
    if quantity_m3 <= 6:
        return "M3_6"
    if quantity_m3 <= 10:
        return "M3_10"
    return "M3_14_PLUS"


def _bulk_band_fee(rules: DeliveryRules, distance_km: Decimal, load_size: LoadSize) -> Optional[Decimal]:
    for band in rules.bands:
        if band.min_km <= distance_km <= band.max_km:
            return band.fees.get(load_size, Decimal(0)) if band.fees else Decimal(0)
    return None


def calculate_delivery_fee(
    rules: DeliveryRules,
    distance_km: Decimal,
    bulk_m3: Decimal = Decimal(0),
    bulk_tons: Decimal = Decimal(0),
    bagged_kg: Decimal = Decimal(0),
    total_m3: Optional[Decimal] = None,
    quote_only_min_m3: Optional[Decimal] = None,
) -> DeliveryQuoteResult:
    """
    Delivery for one order. `bulk_m3`/`bulk_tons` are the loose (tipper)
    quantities, `bagged_kg` the bagged/palletised weight, and `total_m3`
    the whole order's volume (bulk plus bag equivalent) used for the
    customer tier's quote-only threshold. `quote_only_min_m3` is that
    threshold — set only for the Volume/Civil Bulk tier.
    """
    if distance_km < 0:
        raise ValueError("Distance cannot be negative.")
    if bulk_m3 <= 0 and bagged_kg <= 0:
        raise ValueError("Nothing to deliver — order quantity is zero.")
    if total_m3 is None:
        total_m3 = bulk_m3

    reasons: list[str] = []
    reason_codes: list[str] = []
    components: list[dict] = []

    def quote_only(code: str, reason: str) -> None:
        reason_codes.append(code)
        reasons.append(reason)
    load_size: Optional[LoadSize] = None

    if quote_only_min_m3 is not None and total_m3 >= quote_only_min_m3:
        quote_only(VOLUME_THRESHOLD, f"Volume/Civil Bulk tier order of {quote_only_min_m3}m³ or more — routed to RFQ.")
    if distance_km > rules.quote_over_km:
        quote_only(OVER_MAX_DISTANCE, f"Delivery beyond {rules.quote_over_km}km — routed to RFQ for individual quoting.")

    if bulk_m3 > 0:
        meets_minimum = bulk_m3 >= rules.min_bulk_m3 or bulk_tons >= rules.min_bulk_tons
        if meets_minimum:
            load_size = load_size_for_quantity_m3(bulk_m3)
            if distance_km <= rules.quote_over_km:
                fee = _bulk_band_fee(rules, distance_km, load_size)
                if fee is None:
                    quote_only(NO_MATCHING_BAND, "No matching delivery band found — routed to RFQ.")
                else:
                    components.append({"kind": "BULK_TIPPER", "load_size": load_size, "fee": fee})
        elif distance_km <= rules.small_load_max_km:
            components.append({"kind": "SMALL_LOAD", "load_size": None, "fee": rules.small_load_fee})
        else:
            quote_only(
                SMALL_LOAD_OUT_OF_RANGE,
                f"Bulk orders below the {rules.min_bulk_m3}m³ / {rules.min_bulk_tons}-ton minimum are only "
                f"delivered within {rules.small_load_max_km}km — routed to RFQ.",
            )

    if bagged_kg > 0:
        if distance_km <= rules.bagged_max_km:
            fee = Decimal(0) if bagged_kg >= rules.bagged_free_from_kg else rules.bagged_fee
            components.append({"kind": "BAGGED", "load_size": None, "fee": fee})
        else:
            quote_only(BAGGED_OUT_OF_RANGE, f"Bagged/palletised delivery is only priced within {rules.bagged_max_km}km — routed to RFQ.")

    if reasons:
        return DeliveryQuoteResult(
            is_quote_only=True,
            reasons=reasons,
            reason_codes=reason_codes,
            distance_km=distance_km,
            load_size=load_size,
            fee=None,
        )

    return DeliveryQuoteResult(
        is_quote_only=False,
        reasons=[],
        distance_km=distance_km,
        load_size=load_size,
        fee=sum((c["fee"] for c in components), Decimal(0)),
        components=components,
    )
