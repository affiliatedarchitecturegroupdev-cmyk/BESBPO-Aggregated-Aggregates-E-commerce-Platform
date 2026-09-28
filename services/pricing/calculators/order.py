"""
Prices a whole order: every line in the customer's tier, plus one delivery
fee for the combined load. This is what checkout (the NestJS orders module)
calls, so the quote-only rules are decided once, here, for the whole order
rather than line by line.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal

from calculators import packaged_goods
from calculators.delivery_bands import DeliveryQuoteResult, calculate_delivery_fee
from calculators.packaged_goods import PackagedLineResult, PackagedProduct
from calculators.tonnage_volume import LineResult, calculate
from pricing_framework import PricingFramework

# Packaged-goods reasons (CAT-10/11). Bag units ride with the bagged-goods
# delivery rules; the bulk formats are arranged with the supplier.
PRICE_ON_REQUEST = "PRICE_ON_REQUEST"
PACKAGED_BULK_DELIVERY = "PACKAGED_BULK_DELIVERY"
BAG_UNITS = ("BAG_25KG", "BAG_50KG")


@dataclass(frozen=True)
class OrderLine:
    sku: str
    quantity: Decimal
    unit: str  # "ton" | "m3" | "bag", or a packaged unit such as "BAG_50KG"


@dataclass
class OrderResult:
    customer_tier: str
    lines: list[LineResult | PackagedLineResult]
    delivery: DeliveryQuoteResult
    subtotal: Decimal  # priced lines only
    extra_reasons: list[str] = field(default_factory=list)
    extra_reason_codes: list[str] = field(default_factory=list)

    @property
    def is_quote_only(self) -> bool:
        return self.delivery.is_quote_only or bool(self.extra_reason_codes)

    def as_dict(self) -> dict:
        delivery_fee = self.delivery.fee
        total = None if self.is_quote_only or delivery_fee is None else float(self.subtotal + delivery_fee)
        return {
            "customer_tier": self.customer_tier,
            "is_quote_only": self.is_quote_only,
            "reasons": self.delivery.reasons + self.extra_reasons,
            "reason_codes": self.delivery.reason_codes + self.extra_reason_codes,
            "lines": [line.as_dict() for line in self.lines],
            "subtotal": float(self.subtotal),
            "delivery": self.delivery.as_dict(),
            "total": total,
        }


class UnknownSku(KeyError):
    pass


def price_order(
    framework: PricingFramework,
    lines: list[OrderLine],
    distance_km: Decimal,
    customer_tier: str,
    packaged: dict[str, PackagedProduct] | None = None,
) -> OrderResult:
    if not lines:
        raise ValueError("An order needs at least one line.")
    tier = framework.tiers[customer_tier]
    packaged = packaged or {}

    priced: list[LineResult | PackagedLineResult] = []
    extra_reasons: list[str] = []
    extra_codes: list[str] = []
    bulk_m3 = bulk_tons = bagged_kg = total_m3 = Decimal(0)
    for line in lines:
        packaged_product = packaged.get(line.sku)
        if packaged_product is not None:
            result = packaged_goods.calculate(packaged_product, line.quantity, line.unit, tier.discount, allow_unpriced=True)
            priced.append(result)
            if not result.is_priced and PRICE_ON_REQUEST not in extra_codes:
                extra_codes.append(PRICE_ON_REQUEST)
                extra_reasons.append("Some items have no confirmed price yet — our team confirms them with the supplier.")
            if line.unit in BAG_UNITS:
                bagged_kg += result.bagged_kg
            elif PACKAGED_BULK_DELIVERY not in extra_codes:
                extra_codes.append(PACKAGED_BULK_DELIVERY)
                extra_reasons.append("Bulk-bag, tanker, drum and tote deliveries are arranged with the supplier and quoted individually.")
            continue
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

    if bulk_m3 <= 0 and bagged_kg <= 0:
        # Only bulk-format packaged goods (drums, totes, tankers, bulk bags):
        # nothing the delivery bands price — arranged with the supplier.
        delivery = DeliveryQuoteResult(is_quote_only=True, reasons=[], reason_codes=[], distance_km=distance_km, load_size=None, fee=None)
        return OrderResult(customer_tier, priced, delivery, sum((l.total for l in priced if l.total is not None), Decimal(0)), extra_reasons, extra_codes)

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
        subtotal=sum((line.total for line in priced if line.total is not None), Decimal(0)),
        extra_reasons=extra_reasons,
        extra_reason_codes=extra_codes,
    )
