"""
Bulk/bag unit-of-sale + tonnage-volume calculator.

Converts live between tons and m3 using each category's bulk density, and
computes the bagged price from the same base rate — so the displayed price
is never a second, hand-maintained number. Mirrors Module 1 of the platform
spec ("Bulk / Bag Toggle + Tonnage-Volume Calculator").

Every formula here is the one the pricing framework workbook uses, so the
output reconciles with it to the cent (tests/test_reconcile_workbook.py):

    List Price (R/ton) = Base Cost x (1 + Markup %)            [Category Markup Bands!E]
    List Price (R/m3)  = List Price (R/ton) x Density / 1000   [Category Markup Bands!F]
    List Price (R/bag) = R/ton x Bag Premium x Bag Weight/1000 [Sample Priced Catalogue!J]
    Tier price         = List price x (1 - tier discount)      [Sample Priced Catalogue!K,L]
                         never below cost x 1.03 (the floor, PRICING_POLICY.md — Oct 2026)

Money is computed in Decimal and rounded half-up to the cent only at the
unit-price step, the same as Excel's ROUND(x, 2).
"""
from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal, Optional

from calculators.discount_floor import AGGREGATE, TierPrice, tier_price

Unit = Literal["ton", "m3", "bag"]

CENT = Decimal("0.01")
THOUSAND = Decimal(1000)


def to_cents(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


@dataclass(frozen=True)
class ProductPricing:
    sku: str
    name: str
    bulk_density_kg_per_m3: Decimal
    base_cost_per_ton: Decimal
    markup: Decimal  # fraction, e.g. 0.18 for 18%
    units: tuple[Unit, ...]
    bag_premium_multiplier: Optional[Decimal] = None
    bag_weight_kg: Optional[Decimal] = None

    @property
    def list_price_per_ton(self) -> Decimal:
        return self.base_cost_per_ton * (1 + self.markup)

    @property
    def is_sold_bagged(self) -> bool:
        return "bag" in self.units


class UnitNotOffered(ValueError):
    """Raised when a product is priced in a unit it is not sold in."""


def tons_to_m3(tons: Decimal, bulk_density_kg_per_m3: Decimal) -> Decimal:
    """1 ton = 1000kg; m3 = tons * 1000 / density."""
    return tons * THOUSAND / bulk_density_kg_per_m3


def m3_to_tons(m3: Decimal, bulk_density_kg_per_m3: Decimal) -> Decimal:
    return m3 * bulk_density_kg_per_m3 / THOUSAND


def unrounded_list_price(product: ProductPricing, unit: Unit) -> Decimal:
    if unit == "ton":
        return product.list_price_per_ton
    if unit == "m3":
        return product.list_price_per_ton * product.bulk_density_kg_per_m3 / THOUSAND
    if unit == "bag":
        if product.bag_premium_multiplier is None or product.bag_weight_kg is None:
            raise UnitNotOffered(f"{product.name} is not sold bagged.")
        return (
            product.list_price_per_ton
            * product.bag_premium_multiplier
            * product.bag_weight_kg
            / THOUSAND
        )
    raise ValueError(f"Unknown unit: {unit}")


def unit_price(product: ProductPricing, unit: Unit, discount: Decimal = Decimal(0)) -> Decimal:
    """List price less a flat discount, rounded to the cent — the workbook's own formula (no floor)."""
    return to_cents(unrounded_list_price(product, unit) * (1 - discount))


def tier_unit_price(product: ProductPricing, unit: Unit, tier: str) -> TierPrice:
    """The customer's price in `tier`: the tier discount, capped by the margin floor."""
    return tier_price(unrounded_list_price(product, unit), product.markup, AGGREGATE, tier)


@dataclass
class LineResult:
    sku: str
    name: str
    unit: Unit
    quantity: Decimal
    equivalent_tons: Decimal
    equivalent_m3: Decimal
    bagged_kg: Decimal
    list_unit_price: Decimal
    unit_price: Decimal
    discount: Decimal
    subtotal_before_discount: Decimal
    total: Decimal
    # Cost per unit of sale (list / (1 + markup), the cost the margin floor uses) — snapshotted on orders for profit reporting.
    unit_cost: Optional[Decimal] = None
    family: str = AGGREGATE

    def as_dict(self) -> dict:
        return {
            "sku": self.sku,
            "name": self.name,
            "unit": self.unit,
            "quantity": float(self.quantity),
            "equivalent_tons": float(round(self.equivalent_tons, 3)),
            "equivalent_m3": float(round(self.equivalent_m3, 3)),
            "list_unit_price": float(self.list_unit_price),
            "unit_price": float(self.unit_price),
            "discount_percent": float(round(self.discount * 100, 2)),
            "subtotal_before_discount": float(self.subtotal_before_discount),
            "total": float(self.total),
            "unit_cost": None if self.unit_cost is None else float(self.unit_cost),
            "family": self.family,
        }


def calculate(
    product: ProductPricing,
    quantity: Decimal,
    unit: Unit,
    tier: str = "RETAIL",
) -> LineResult:
    """
    Price one line: the equivalent tons/m3 for the quantity, the unit price
    in the customer's tier, and the line total. The line total is
    quantity x tier unit price (rounded to the cent), so an invoice line
    always multiplies out exactly.
    """
    if unit not in product.units:
        offered = ", ".join(product.units)
        raise UnitNotOffered(f"{product.name} is not sold per {unit} — offered: {offered}.")
    if quantity <= 0:
        raise ValueError("Quantity must be greater than zero.")
    if unit == "bag" and quantity != quantity.to_integral_value():
        raise ValueError("Bagged quantities must be a whole number of bags.")

    density = product.bulk_density_kg_per_m3
    bagged_kg = Decimal(0)
    if unit == "ton":
        tons = quantity
        m3 = tons_to_m3(tons, density)
    elif unit == "m3":
        m3 = quantity
        tons = m3_to_tons(m3, density)
    else:
        bagged_kg = quantity * product.bag_weight_kg
        tons = bagged_kg / THOUSAND
        m3 = tons_to_m3(tons, density)

    list_price = unit_price(product, unit)
    priced = tier_unit_price(product, unit, tier)
    discount = priced.discount

    return LineResult(
        sku=product.sku,
        name=product.name,
        unit=unit,
        quantity=quantity,
        equivalent_tons=tons,
        equivalent_m3=m3,
        bagged_kg=bagged_kg,
        list_unit_price=list_price,
        unit_price=priced.unit_price,
        discount=discount,
        subtotal_before_discount=to_cents(quantity * list_price),
        total=to_cents(quantity * priced.unit_price),
        unit_cost=to_cents(unrounded_list_price(product, unit) / (1 + product.markup)),
    )
