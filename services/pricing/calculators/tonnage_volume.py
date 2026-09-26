"""
Bulk/bag unit-of-sale + tonnage-volume calculator.

Converts live between tons and m3 using each product's bulk density, and
computes the bagged price from the same base rate — so the displayed price
is never a second, hand-maintained number. Mirrors Module 1 of the platform
spec ("Bulk / Bag Toggle + Tonnage-Volume Calculator").
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Optional

Unit = Literal["ton", "m3", "bag"]


@dataclass
class ProductPricing:
    sku: str
    name: str
    bulk_density_kg_per_m3: float
    list_price_per_ton: float
    bag_premium_multiplier: Optional[float] = None
    bag_weight_kg: Optional[float] = None


class BaggedUnitUnavailable(ValueError):
    """Raised when a bag price is requested for a bulk-only product."""


def tons_to_m3(tons: float, bulk_density_kg_per_m3: float) -> float:
    """1 ton = 1000kg; m3 = tons * 1000 / density."""
    return tons * 1000 / bulk_density_kg_per_m3


def m3_to_tons(m3: float, bulk_density_kg_per_m3: float) -> float:
    return m3 * bulk_density_kg_per_m3 / 1000


def price_per_m3(product: ProductPricing) -> float:
    return round(product.list_price_per_ton * product.bulk_density_kg_per_m3 / 1000, 2)


def price_per_bag(product: ProductPricing) -> float:
    if product.bag_premium_multiplier is None or product.bag_weight_kg is None:
        raise BaggedUnitUnavailable(
            f"{product.name} is not sold bagged — bulk (ton/m3) only."
        )
    base_bag_equivalent = product.list_price_per_ton / 1000 * product.bag_weight_kg
    return round(base_bag_equivalent * product.bag_premium_multiplier, 2)


def apply_tier_discount(price: float, discount_percent: float) -> float:
    return round(price * (1 - discount_percent / 100), 2)


def calculate(
    product: ProductPricing,
    quantity: float,
    unit: Unit,
    discount_percent: float = 0.0,
) -> dict:
    """
    Given a quantity in ton, m3, or bag, return the full set of equivalent
    quantities and the priced total in the customer's tier — the "one
    number, converted live" behaviour the storefront calculator needs.
    """
    if unit == "ton":
        tons = quantity
        m3 = tons_to_m3(tons, product.bulk_density_kg_per_m3)
        unit_price = product.list_price_per_ton
        subtotal = tons * unit_price
    elif unit == "m3":
        m3 = quantity
        tons = m3_to_tons(m3, product.bulk_density_kg_per_m3)
        unit_price = price_per_m3(product)
        subtotal = m3 * unit_price
    elif unit == "bag":
        unit_price = price_per_bag(product)
        subtotal = quantity * unit_price
        # equivalent bulk quantities, for display only
        bag_kg_total = quantity * (product.bag_weight_kg or 0)
        tons = bag_kg_total / 1000
        m3 = tons_to_m3(tons, product.bulk_density_kg_per_m3)
    else:
        raise ValueError(f"Unknown unit: {unit}")

    total = apply_tier_discount(subtotal, discount_percent)

    return {
        "sku": product.sku,
        "name": product.name,
        "unit": unit,
        "quantity": quantity,
        "equivalent_tons": round(tons, 3),
        "equivalent_m3": round(m3, 3),
        "unit_price": unit_price,
        "subtotal_before_discount": round(subtotal, 2),
        "discount_percent": discount_percent,
        "total": total,
    }
