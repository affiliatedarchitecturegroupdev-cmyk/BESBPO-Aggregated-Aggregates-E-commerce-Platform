"""
Packaged-goods calculator for CAT-10 (Cement & Hydraulic Binders) and
CAT-11 (Mortars, Grouts & Admixtures).

These are sold as discrete packaged units — a 50kg bag, a 210L drum, a
tanker load per ton — each with its own list price, so there is no ton/m3
conversion. Prices come from data/b2b_packaged_catalogue.json (the B2B
pricing workbook). Several units have no real benchmark yet; this
calculator refuses to price them rather than inventing a number
(AGENTIC_RULES.md rules 1 and 10), and the order calculator routes them to
a quote.

    Tier price = List price x (1 - tier discount), rounded half-up to the cent
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from typing import Optional

from calculators.tonnage_volume import to_cents

DATA_PATH = Path(__file__).parent.parent / "data" / "b2b_packaged_catalogue.json"
READY_STATUS = "Ready — benchmarked"
PACKAGED_UNITS = ("BAG_25KG", "BAG_50KG", "BULK_BAG_1_5T", "BULK_TANKER_PER_TON", "DRUM_210L", "IBC_TOTE_1000L")


class PricingNotAvailable(ValueError):
    """The unit has no confirmed benchmark price to quote from."""


class PackagedUnitNotOffered(ValueError):
    """The product isn't sold in that packaged unit."""


@dataclass(frozen=True)
class PackagedUnit:
    unit: str
    label: str
    list_price: Optional[Decimal]
    pricing_status: str
    source_note: str
    weight_kg: Optional[Decimal]  # known for bags only

    @property
    def is_priced(self) -> bool:
        return self.pricing_status == READY_STATUS and self.list_price is not None


@dataclass(frozen=True)
class PackagedProduct:
    sku: str
    name: str
    category_slug: str
    units: dict[str, PackagedUnit]


def load(path: Path = DATA_PATH) -> tuple[dict, dict[str, PackagedProduct]]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    weights = {k: Decimal(str(v)) for k, v in raw["unit_weights_kg"].items()}
    products = {}
    for p in raw["products"]:
        units = {}
        for u in p["units"]:
            price = u["list_price_per_unit"]
            units[u["unit"]] = PackagedUnit(
                unit=u["unit"],
                label=u["unit_label"],
                list_price=None if price is None else Decimal(str(price)),
                pricing_status=u["pricing_status"],
                source_note=u["source_note"],
                weight_kg=weights.get(u["unit"]),
            )
        products[p["sku"]] = PackagedProduct(sku=p["sku"], name=p["name"], category_slug=p["category_slug"], units=units)
    return raw, products


@dataclass
class PackagedLineResult:
    sku: str
    name: str
    unit: str
    unit_label: str
    quantity: Decimal
    bagged_kg: Decimal
    pricing_status: str
    source_note: str
    list_unit_price: Optional[Decimal]
    unit_price: Optional[Decimal]
    discount: Decimal
    subtotal_before_discount: Optional[Decimal]
    total: Optional[Decimal]

    @property
    def is_priced(self) -> bool:
        return self.total is not None

    def as_dict(self) -> dict:
        money = lambda v: None if v is None else float(v)  # noqa: E731
        return {
            "sku": self.sku,
            "name": self.name,
            "unit": self.unit,
            "unit_label": self.unit_label,
            "quantity": float(self.quantity),
            "equivalent_tons": float(round(self.bagged_kg / 1000, 3)),
            "equivalent_m3": 0.0,
            "pricing_status": self.pricing_status,
            "source_note": self.source_note,
            "list_unit_price": money(self.list_unit_price),
            "unit_price": money(self.unit_price),
            "discount_percent": float(self.discount * 100),
            "subtotal_before_discount": money(self.subtotal_before_discount),
            "total": money(self.total),
        }


def calculate(product: PackagedProduct, quantity: Decimal, unit: str, discount: Decimal = Decimal(0), *, allow_unpriced: bool = False) -> PackagedLineResult:
    """
    Price one packaged line in the customer's tier. A unit without a
    confirmed price raises PricingNotAvailable, unless allow_unpriced (the
    order calculator), in which case the line comes back with no price.
    """
    packaged = product.units.get(unit)
    if packaged is None:
        offered = ", ".join(u.label for u in product.units.values())
        raise PackagedUnitNotOffered(f"{product.name} is not sold as {unit} — offered: {offered}.")
    if quantity <= 0:
        raise ValueError("Quantity must be greater than zero.")
    if quantity != quantity.to_integral_value():
        raise ValueError("Packaged quantities must be a whole number of units.")
    bagged_kg = quantity * packaged.weight_kg if packaged.weight_kg is not None else Decimal(0)

    if not packaged.is_priced:
        if not allow_unpriced:
            raise PricingNotAvailable(
                f"{product.name} ({packaged.label}) has no confirmed price yet ({packaged.pricing_status}) — "
                "request a quote and our team will confirm it with the supplier."
            )
        return PackagedLineResult(
            sku=product.sku, name=product.name, unit=unit, unit_label=packaged.label, quantity=quantity,
            bagged_kg=bagged_kg, pricing_status=packaged.pricing_status, source_note=packaged.source_note,
            list_unit_price=None, unit_price=None, discount=discount, subtotal_before_discount=None, total=None,
        )

    list_price = to_cents(packaged.list_price)
    tier_price = to_cents(packaged.list_price * (1 - discount))
    return PackagedLineResult(
        sku=product.sku, name=product.name, unit=unit, unit_label=packaged.label, quantity=quantity,
        bagged_kg=bagged_kg, pricing_status=packaged.pricing_status, source_note=packaged.source_note,
        list_unit_price=list_price, unit_price=tier_price, discount=discount,
        subtotal_before_discount=to_cents(quantity * list_price), total=to_cents(quantity * tier_price),
    )
