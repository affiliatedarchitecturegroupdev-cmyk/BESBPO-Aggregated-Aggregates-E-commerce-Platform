"""
Prices a whole order: every line in the customer's tier, plus one delivery
fee for the combined load. This is what checkout (the NestJS orders module)
calls, so the quote-only rules are decided once, here, for the whole order
rather than line by line.
"""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from calculators.delivery_bands import DeliveryQuoteResult, calculate_delivery_fee
from calculators.tonnage_volume import LineResult, Unit, calculate
from pricing_framework import PricingFramework


@dataclass(frozen=True)
class OrderLine:
    sku: str
    quantity: Decimal
    unit: Unit


@dataclass
class OrderResult:
    customer_tier: str
    lines: list[LineResult]
    delivery: DeliveryQuoteResult
    subtotal: Decimal

    @property
    def is_quote_only(self) -> bool:
        return self.delivery.is_quote_only

    def as_dict(self) -> dict:
        delivery_fee = self.delivery.fee
        return {
            "customer_tier": self.customer_tier,
            "is_quote_only": self.is_quote_only,
            "reasons": self.delivery.reasons,
            "reason_codes": self.delivery.reason_codes,
            "lines": [line.as_dict() for line in self.lines],
            "subtotal": float(self.subtotal),
            "delivery": self.delivery.as_dict(),
            "total": None if delivery_fee is None else float(self.subtotal + delivery_fee),
        }


class UnknownSku(KeyError):
    pass


def price_order(
    framework: PricingFramework,
    lines: list[OrderLine],
    distance_km: Decimal,
    customer_tier: str,
) -> OrderResult:
    if not lines:
        raise ValueError("An order needs at least one line.")
    tier = framework.tiers[customer_tier]

    priced: list[LineResult] = []
    bulk_m3 = bulk_tons = bagged_kg = total_m3 = Decimal(0)
    for line in lines:
        product = framework.products.get(line.sku)
        if product is None:
            raise UnknownSku(line.sku)
        result = calculate(product, line.quantity, line.unit, tier.discount)
        priced.append(result)
        total_m3 += result.equivalent_m3
        if line.unit == "bag":
            bagged_kg += result.bagged_kg
        else:
            bulk_m3 += result.equivalent_m3
            bulk_tons += result.equivalent_tons

    delivery = calculate_delivery_fee(
        framework.delivery,
        distance_km=distance_km,
        bulk_m3=bulk_m3,
        bulk_tons=bulk_tons,
        bagged_kg=bagged_kg,
        total_m3=total_m3,
        quote_only_min_m3=tier.quote_only_min_m3,
    )

    return OrderResult(
        customer_tier=customer_tier,
        lines=priced,
        delivery=delivery,
        subtotal=sum((line.total for line in priced), Decimal(0)),
    )
