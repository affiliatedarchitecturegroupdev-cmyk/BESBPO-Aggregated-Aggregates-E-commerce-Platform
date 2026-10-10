"""
Packaged-goods calculator for CAT-10 (Cement & Hydraulic Binders),
CAT-11 (Mortars, Grouts & Admixtures), the steel line, CAT-15 to CAT-18
(rebar, mesh & brickforce, fixing accessories, structural steel —
data/steel_catalogue.json, STEEL_CATALOGUE.md) and the masonry line, CAT-19
and CAT-20 (bricks & blocks; lintels, DPC & wall accessories —
data/masonry_catalogue.json, MASONRY_CATALOGUE.md).

These are sold as discrete packaged units — a 50kg bag, a 210L drum, a
tanker load per ton — each with its own list price, so there is no ton/m3
conversion. Prices come from data/b2b_packaged_catalogue.json (the B2B
pricing workbook). Several units have no real benchmark yet; this
calculator refuses to price them rather than inventing a number
(AGENTIC_RULES.md rules 1 and 10), and the order calculator routes them to
a quote.

    Tier price = List price x (1 - tier discount), rounded half-up to the cent,
                 never below cost x 1.03 (calculators/discount_floor.py)

Bagged cement and mortar (25/50kg) take a 4% trade discount; bulk formats
(bulk bag, tanker, drum, tote) have no self-serve trade price, and every
Volume/Civil Bulk order of these goods is quoted (PRICING_POLICY.md). Steel
and masonry are each their own family (STEEL, MASONRY) whatever the unit —
the family follows the product's line, since the lines share units (item, roll).
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from typing import Optional

from calculators.discount_floor import CEMENT_BAGGED, CEMENT_BULK, MASONRY, STEEL, STOREFRONT_MARKUP, TierQuoteOnly, tier_price
from calculators.tonnage_volume import to_cents

DATA_PATH = Path(__file__).parent.parent / "data" / "b2b_packaged_catalogue.json"
STEEL_DATA_PATH = Path(__file__).parent.parent / "data" / "steel_catalogue.json"
MASONRY_DATA_PATH = Path(__file__).parent.parent / "data" / "masonry_catalogue.json"
READY_STATUS = "Ready — benchmarked"
CEMENT_UNITS = ("BAG_25KG", "BAG_50KG", "BULK_BAG_1_5T", "BULK_TANKER_PER_TON", "DRUM_210L", "IBC_TOTE_1000L")
# Steel: stock lengths, tonnes, mesh sheets, brickforce rolls, wire coils, packs and single items.
STEEL_UNITS = ("LENGTH_6M", "LENGTH_12M", "TONNE", "SHEET", "ROLL", "COIL", "PACK", "EACH")
# Masonry: bricks per 1,000, blocks, lintels and air bricks per item, DPC per roll.
MASONRY_UNITS = ("THOUSAND", "EACH", "ROLL")
PACKAGED_UNITS = CEMENT_UNITS + STEEL_UNITS + ("THOUSAND",)
# Lines that travel on the supplier's own flatbed or crane truck, never in the tipper bands.
OWN_TRANSPORT_LINES = ("steel", "masonry")
BAGGED_UNITS = ("BAG_25KG", "BAG_50KG")
TIER_QUOTE_STATUS = "Quoted for your tier"


def family_for(product: "PackagedProduct", unit: str) -> str:
    """Steel and masonry are their own families; cement bags take the bagged discount and bulk formats are quoted for trade and volume."""
    if product.line == "steel":
        return STEEL
    if product.line == "masonry":
        return MASONRY
    return CEMENT_BAGGED if unit in BAGGED_UNITS else CEMENT_BULK


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
    weight_kg: Optional[Decimal]  # bags, and steel or masonry units with a known mass
    markup: Decimal = STOREFRONT_MARKUP  # fraction; sets the margin floor

    @property
    def is_priced(self) -> bool:
        return self.pricing_status == READY_STATUS and self.list_price is not None


@dataclass(frozen=True)
class PackagedProduct:
    sku: str
    name: str
    category_slug: str
    units: dict[str, PackagedUnit]
    line: str = "cement"  # "cement" (CAT-10/11), "steel" (CAT-15..18) or "masonry" (CAT-19/20)

    @property
    def is_steel(self) -> bool:
        return self.line == "steel"

    @property
    def own_transport(self) -> bool:
        """Delivered on the supplier's flatbed or crane truck, not in the tipper bands."""
        return self.line in OWN_TRANSPORT_LINES


def _products(raw: dict, allowed_units: tuple[str, ...], line: str) -> dict[str, PackagedProduct]:
    weights = {k: Decimal(str(v)) for k, v in raw.get("unit_weights_kg", {}).items()}
    products = {}
    for p in raw["products"]:
        units = {}
        for u in p["units"]:
            if u["unit"] not in allowed_units:
                raise ValueError(f"{p['sku']}: unit {u['unit']} is not one of {allowed_units}")
            price = u["list_price_per_unit"]
            weight = u.get("weight_kg")
            units[u["unit"]] = PackagedUnit(
                unit=u["unit"],
                label=u["unit_label"],
                list_price=None if price is None else Decimal(str(price)),
                pricing_status=u["pricing_status"],
                source_note=u["source_note"],
                weight_kg=Decimal(str(weight)) if weight is not None else weights.get(u["unit"]),
                markup=STOREFRONT_MARKUP if u.get("markup_percent") is None else Decimal(str(u["markup_percent"])) / 100,
            )
        products[p["sku"]] = PackagedProduct(sku=p["sku"], name=p["name"], category_slug=p["category_slug"], units=units, line=line)
    return products


def load(path: Path = DATA_PATH) -> tuple[dict, dict[str, PackagedProduct]]:
    """The CAT-10/11 packaged-goods catalogue."""
    raw = json.loads(path.read_text(encoding="utf-8"))
    return raw, _products(raw, CEMENT_UNITS, "cement")


def load_steel(path: Path = STEEL_DATA_PATH) -> tuple[dict, dict[str, PackagedProduct]]:
    """The CAT-15..18 steel catalogue — priced exactly like packaged goods, in the STEEL family."""
    raw = json.loads(path.read_text(encoding="utf-8"))
    return raw, _products(raw, STEEL_UNITS, "steel")


def load_masonry(path: Path = MASONRY_DATA_PATH) -> tuple[dict, dict[str, PackagedProduct]]:
    """The CAT-19/20 masonry catalogue — priced like packaged goods, in the MASONRY family."""
    raw = json.loads(path.read_text(encoding="utf-8"))
    return raw, _products(raw, MASONRY_UNITS, "masonry")


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
    # Cost per unit (list / (1 + markup)) — snapshotted on orders for profit reporting; None when unpriced.
    unit_cost: Optional[Decimal] = None
    family: str = ""

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
            "unit_cost": money(self.unit_cost),
            "family": self.family,
            "quantity": float(self.quantity),
            "equivalent_tons": float(round(self.bagged_kg / 1000, 3)),
            "equivalent_m3": 0.0,
            "pricing_status": self.pricing_status,
            "source_note": self.source_note,
            "list_unit_price": money(self.list_unit_price),
            "unit_price": money(self.unit_price),
            "discount_percent": float(round(self.discount * 100, 2)),
            "subtotal_before_discount": money(self.subtotal_before_discount),
            "total": money(self.total),
        }


def calculate(product: PackagedProduct, quantity: Decimal, unit: str, tier: str = "RETAIL", *, allow_unpriced: bool = False) -> PackagedLineResult:
    """
    Price one packaged line in the customer's tier. A unit without a
    confirmed price raises PricingNotAvailable, and a tier with no
    self-serve price for the unit raises TierQuoteOnly — unless
    allow_unpriced (the order calculator), in which case the line comes back
    with no price.
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

    unpriced = lambda status: PackagedLineResult(  # noqa: E731
        sku=product.sku, name=product.name, unit=unit, unit_label=packaged.label, quantity=quantity,
        bagged_kg=bagged_kg, pricing_status=status, source_note=packaged.source_note,
        list_unit_price=None, unit_price=None, discount=Decimal(0), subtotal_before_discount=None, total=None,
        family=family_for(product, unit),
    )
    if not packaged.is_priced:
        if not allow_unpriced:
            raise PricingNotAvailable(
                f"{product.name} ({packaged.label}) has no confirmed price yet ({packaged.pricing_status}) — "
                "request a quote and our team will confirm it with the supplier."
            )
        return unpriced(packaged.pricing_status)

    try:
        priced = tier_price(packaged.list_price, packaged.markup, family_for(product, unit), tier)
    except TierQuoteOnly:
        if not allow_unpriced:
            raise
        return unpriced(TIER_QUOTE_STATUS)
    list_price = to_cents(packaged.list_price)
    return PackagedLineResult(
        sku=product.sku, name=product.name, unit=unit, unit_label=packaged.label, quantity=quantity,
        bagged_kg=bagged_kg, pricing_status=packaged.pricing_status, source_note=packaged.source_note,
        list_unit_price=list_price, unit_price=priced.unit_price, discount=priced.discount,
        subtotal_before_discount=to_cents(quantity * list_price), total=to_cents(quantity * priced.unit_price),
        unit_cost=to_cents(packaged.list_price / (1 + packaged.markup)), family=family_for(product, unit),
    )
