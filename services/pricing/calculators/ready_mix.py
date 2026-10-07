"""
Ready-mix concrete (CAT-12) — priced per m³ by strength grade, with pump
hire as a separately priced add-on (READY_MIX_CATALOGUE.md).

Ready-mix fits neither the ton/m³ calculator (no density conversion) nor the
packaged-goods one (no pack sizes): it is sold by the m³, in at least a full
mixer-truck load, and is perishable within ~90 minutes of batching. So:

  - a grade with no confirmed benchmark refuses to price (PricingNotAvailable)
    and goes to a quote — never an interpolated number (AGENTIC_RULES.md rule 1);
  - a quantity below the grade's minimum load is refused (BelowMinimumLoad):
    it isn't a smaller order, it isn't a deliverable one;
  - tier discounts follow PRICING_POLICY.md (trade 2%, volume quoted), capped
    by the margin floor (calculators/discount_floor.py).

Pump cost = call-out fee + rate per m³ x quantity, once a written supplier
quote is loaded; until then every pump is quote-only. Distance and washout
are confirmed in the quote.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from typing import Optional

from calculators.discount_floor import READY_MIX, TierQuoteOnly, tier_price
from calculators.tonnage_volume import to_cents

DATA_PATH = Path(__file__).parent.parent / "data" / "ready_mix_catalogue.json"
READY_STATUS = "Ready — benchmarked"
UNIT = "m3"


class PricingNotAvailable(ValueError):
    """The grade (or pump) has no confirmed price to quote from."""


class BelowMinimumLoad(ValueError):
    """The quantity is below the smallest full mixer-truck load for the grade."""


@dataclass(frozen=True)
class ReadyMixProduct:
    sku: str
    name: str
    strength_grade_mpa: int
    minimum_load_m3: Decimal
    list_price_per_m3: Optional[Decimal]
    markup: Decimal
    pricing_status: str
    source_note: str

    @property
    def is_priced(self) -> bool:
        return self.pricing_status == READY_STATUS and self.list_price_per_m3 is not None


@dataclass(frozen=True)
class Pump:
    code: str
    name: str
    call_out_fee: Optional[Decimal]
    rate_per_m3: Optional[Decimal]
    pricing_status: str

    @property
    def is_priced(self) -> bool:
        return self.pricing_status == READY_STATUS and (self.call_out_fee is not None or self.rate_per_m3 is not None)


def _dec(value) -> Optional[Decimal]:
    return None if value is None else Decimal(str(value))


def load(path: Path = DATA_PATH) -> tuple[dict, dict[str, ReadyMixProduct], dict[str, Pump]]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    products = {
        p["sku"]: ReadyMixProduct(
            sku=p["sku"],
            name=p["name"],
            strength_grade_mpa=p["strength_grade_mpa"],
            minimum_load_m3=Decimal(str(p["minimum_load_m3"])),
            list_price_per_m3=_dec(p["list_price_per_m3"]),
            markup=Decimal(str(p["markup_percent"])) / 100,
            pricing_status=p["pricing_status"],
            source_note=p["source_note"],
        )
        for p in raw["products"]
    }
    pumps = {
        p["code"]: Pump(p["code"], p["name"], _dec(p["call_out_fee"]), _dec(p["rate_per_m3"]), p["pricing_status"])
        for p in raw["pumps"]
    }
    return raw, products, pumps


@dataclass
class ReadyMixLineResult:
    sku: str
    name: str
    quantity: Decimal
    pricing_status: str
    source_note: str
    list_unit_price: Optional[Decimal]
    unit_price: Optional[Decimal]
    discount: Decimal
    subtotal_before_discount: Optional[Decimal]
    total: Optional[Decimal]
    unit: str = UNIT

    @property
    def is_priced(self) -> bool:
        return self.total is not None

    def as_dict(self) -> dict:
        money = lambda v: None if v is None else float(v)  # noqa: E731
        return {
            "sku": self.sku,
            "name": self.name,
            "unit": self.unit,
            "unit_label": "m³",
            "quantity": float(self.quantity),
            "equivalent_tons": 0.0,
            "equivalent_m3": float(self.quantity),
            "pricing_status": self.pricing_status,
            "source_note": self.source_note,
            "list_unit_price": money(self.list_unit_price),
            "unit_price": money(self.unit_price),
            "discount_percent": float(round(self.discount * 100, 2)),
            "subtotal_before_discount": money(self.subtotal_before_discount),
            "total": money(self.total),
        }


TIER_QUOTE_STATUS = "Quoted for your tier"


def calculate(product: ReadyMixProduct, quantity_m3: Decimal, tier: str = "RETAIL", *, allow_unpriced: bool = False) -> ReadyMixLineResult:
    if quantity_m3 <= 0:
        raise ValueError("Quantity must be greater than zero.")
    if quantity_m3 < product.minimum_load_m3:
        raise BelowMinimumLoad(
            f"{product.name} is batched in full mixer-truck loads of at least {product.minimum_load_m3}m³ — "
            f"{quantity_m3}m³ can't be delivered on its own."
        )
    unpriced = lambda status: ReadyMixLineResult(  # noqa: E731
        sku=product.sku, name=product.name, quantity=quantity_m3, pricing_status=status, source_note=product.source_note,
        list_unit_price=None, unit_price=None, discount=Decimal(0), subtotal_before_discount=None, total=None,
    )
    if not product.is_priced:
        if not allow_unpriced:
            raise PricingNotAvailable(
                f"{product.name} has no confirmed price yet ({product.pricing_status}) — request a quote and we confirm it with the plant."
            )
        return unpriced(product.pricing_status)
    try:
        priced = tier_price(product.list_price_per_m3, product.markup, READY_MIX, tier)
    except TierQuoteOnly:
        if not allow_unpriced:
            raise
        return unpriced(TIER_QUOTE_STATUS)
    list_price = to_cents(product.list_price_per_m3)
    return ReadyMixLineResult(
        sku=product.sku, name=product.name, quantity=quantity_m3, pricing_status=product.pricing_status,
        source_note=product.source_note, list_unit_price=list_price, unit_price=priced.unit_price, discount=priced.discount,
        subtotal_before_discount=to_cents(quantity_m3 * list_price), total=to_cents(quantity_m3 * priced.unit_price),
    )


def price_pump(pump: Pump, quantity_m3: Decimal) -> dict:
    if not pump.is_priced:
        raise PricingNotAvailable(
            f"{pump.name} has no supplier-quoted rate yet — we quote the pump for your site; the concrete itself is still priced."
        )
    total = (pump.call_out_fee or Decimal(0)) + (pump.rate_per_m3 or Decimal(0)) * quantity_m3
    return {
        "code": pump.code,
        "name": pump.name,
        "quantity_m3": float(quantity_m3),
        "call_out_fee": float(pump.call_out_fee or 0),
        "rate_per_m3": float(pump.rate_per_m3 or 0),
        "total": float(to_cents(total)),
        "note": "Distance and washout charges are confirmed in the quote.",
    }
