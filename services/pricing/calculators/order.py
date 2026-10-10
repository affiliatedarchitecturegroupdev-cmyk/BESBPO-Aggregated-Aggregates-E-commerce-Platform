"""
Prices a whole order: every line in the customer's tier, plus one delivery
fee for the combined load. This is what checkout (the NestJS orders module)
calls, so the quote-only rules are decided once, here, for the whole order
rather than line by line.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal

from calculators import packaged_goods, ready_mix
from calculators.delivery_bands import DeliveryQuoteResult, calculate_delivery_fee
from calculators.packaged_goods import PackagedLineResult, PackagedProduct
from calculators.ready_mix import ReadyMixLineResult, ReadyMixProduct
from calculators.tonnage_volume import LineResult, calculate
from pricing_framework import PricingFramework

# Packaged-goods reasons (CAT-10/11). Bag units ride with the bagged-goods
# delivery rules; the bulk formats are arranged with the supplier.
PRICE_ON_REQUEST = "PRICE_ON_REQUEST"
TIER_QUOTE_ONLY = "TIER_QUOTE_ONLY"
PACKAGED_BULK_DELIVERY = "PACKAGED_BULK_DELIVERY"
BAG_UNITS = ("BAG_25KG", "BAG_50KG")
# Ready-mix travels in the batching plant's mixer truck, not a tipper, so it
# never counts towards the tipper delivery bands.
READY_MIX_DELIVERY_NOTE = (
    "Ready-mix is delivered by the batching plant's mixer truck: we confirm your pour slot "
    "(and any distance surcharge) with the plant before dispatch."
)
# Steel travels on the merchant's flatbed or crane truck, not a tipper.
STEEL_DELIVERY_NOTE = (
    "Steel is delivered by the merchant's flatbed or crane truck: we confirm the delivery slot "
    "and any delivery charge with you before dispatch, and send the mill certificates with the load."
)
# Bricks, blocks and lintels come palletised on the supplier's flatbed or crane truck.
MASONRY_DELIVERY_NOTE = (
    "Bricks, blocks and lintels are delivered palletised by the supplier's flatbed or crane truck: we confirm "
    "the delivery slot, any delivery charge and the yard's minimum load with you before dispatch."
)


@dataclass(frozen=True)
class OrderLine:
    sku: str
    quantity: Decimal
    unit: str  # "ton" | "m3" | "bag", or a packaged unit such as "BAG_50KG"


@dataclass
class OrderResult:
    customer_tier: str
    lines: list[LineResult | PackagedLineResult | ReadyMixLineResult]
    delivery: DeliveryQuoteResult
    subtotal: Decimal  # priced lines only
    extra_reasons: list[str] = field(default_factory=list)
    extra_reason_codes: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)  # informational, never blocks checkout

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
            "notes": self.notes,
        }


class UnknownSku(KeyError):
    pass


def price_order(
    framework: PricingFramework,
    lines: list[OrderLine],
    distance_km: Decimal,
    customer_tier: str,
    packaged: dict[str, PackagedProduct] | None = None,
    ready_mixes: dict[str, ReadyMixProduct] | None = None,
) -> OrderResult:
    if not lines:
        raise ValueError("An order needs at least one line.")
    tier = framework.tiers[customer_tier]
    packaged = packaged or {}
    ready_mixes = ready_mixes or {}
    notes: list[str] = []

    priced: list[LineResult | PackagedLineResult] = []
    extra_reasons: list[str] = []
    extra_codes: list[str] = []
    bulk_m3 = bulk_tons = bagged_kg = total_m3 = Decimal(0)
    for line in lines:
        ready = ready_mixes.get(line.sku)
        if ready is not None:
            if line.unit != ready_mix.UNIT:
                raise ValueError(f"{ready.name} is sold per m³.")
            result = ready_mix.calculate(ready, line.quantity, customer_tier, allow_unpriced=True)
            priced.append(result)
            if result.pricing_status == ready_mix.TIER_QUOTE_STATUS:
                if TIER_QUOTE_ONLY not in extra_codes:
                    extra_codes.append(TIER_QUOTE_ONLY)
                    extra_reasons.append("Volume/Civil Bulk ready-mix is quoted per project.")
            elif not result.is_priced and PRICE_ON_REQUEST not in extra_codes:
                extra_codes.append(PRICE_ON_REQUEST)
                extra_reasons.append("Some items have no confirmed price yet — our team confirms them with the supplier.")
            if READY_MIX_DELIVERY_NOTE not in notes:
                notes.append(READY_MIX_DELIVERY_NOTE)
            continue
        packaged_product = packaged.get(line.sku)
        if packaged_product is not None:
            result = packaged_goods.calculate(packaged_product, line.quantity, line.unit, customer_tier, allow_unpriced=True)
            priced.append(result)
            if result.pricing_status == packaged_goods.TIER_QUOTE_STATUS:
                if TIER_QUOTE_ONLY not in extra_codes:
                    extra_codes.append(TIER_QUOTE_ONLY)
                    extra_reasons.append(
                        "Volume / Civil Bulk steel is quoted per project."
                        if packaged_product.line == "steel"
                        else "Volume / Civil Bulk bricks, blocks and wall accessories are quoted per project."
                        if packaged_product.line == "masonry"
                        else "Trade and volume pricing for cement in bulk, and volume pricing for all cement, is quoted individually."
                    )
            elif not result.is_priced and PRICE_ON_REQUEST not in extra_codes:
                extra_codes.append(PRICE_ON_REQUEST)
                extra_reasons.append("Some items have no confirmed price yet — our team confirms them with the supplier.")
            if packaged_product.own_transport:
                note = STEEL_DELIVERY_NOTE if packaged_product.line == "steel" else MASONRY_DELIVERY_NOTE
                if note not in notes:
                    notes.append(note)
            elif line.unit in BAG_UNITS:
                bagged_kg += result.bagged_kg
            elif PACKAGED_BULK_DELIVERY not in extra_codes:
                extra_codes.append(PACKAGED_BULK_DELIVERY)
                extra_reasons.append("Bulk-bag, tanker, drum and tote deliveries are arranged with the supplier and quoted individually.")
            continue
        product = framework.products.get(line.sku)
        if product is None:
            raise UnknownSku(line.sku)
        result = calculate(product, line.quantity, line.unit, customer_tier)
        priced.append(result)
        total_m3 += result.equivalent_m3
        if line.unit == "bag":
            bagged_kg += result.bagged_kg
        else:
            bulk_m3 += result.equivalent_m3
            bulk_tons += result.equivalent_tons

    subtotal = sum((l.total for l in priced if l.total is not None), Decimal(0))
    if bulk_m3 <= 0 and bagged_kg <= 0:
        own_skus = {sku for sku, p in packaged.items() if p.own_transport}
        own_transport = all(isinstance(l, ReadyMixLineResult) or l.sku in own_skus for l in priced)
        if own_transport:
            # Nothing travels by tipper: the plant's mixer truck or the steel / masonry supplier's truck delivers.
            delivery = DeliveryQuoteResult(is_quote_only=False, reasons=[], reason_codes=[], distance_km=distance_km, load_size=None, fee=Decimal(0))
        else:
            # Bulk-format packaged goods (drums, totes, tankers, bulk bags):
            # nothing the delivery bands price — arranged with the supplier.
            delivery = DeliveryQuoteResult(is_quote_only=True, reasons=[], reason_codes=[], distance_km=distance_km, load_size=None, fee=None)
        return OrderResult(customer_tier, priced, delivery, subtotal, extra_reasons, extra_codes, notes)

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
        subtotal=subtotal,
        extra_reasons=extra_reasons,
        extra_reason_codes=extra_codes,
        notes=notes,
    )
