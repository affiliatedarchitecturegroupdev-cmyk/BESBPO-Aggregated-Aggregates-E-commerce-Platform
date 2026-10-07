"""
Plant hire (wet hire) and site services — the Agent model
(PLANT_HIRE_CATALOGUE.md).

AA brokers the job: the hire contract is between customer and partner and AA
earns a commission (approved 12%, Oct 2026) on the partner's written rate.

    customer price = partner rate x (1 + commission)
    partner payout = partner rate x quantity (+ excess hours, mobilisation)

Rates live in data/plant_services_catalogue.json under "rates", written only
by ratecards/load_rate_cards.py from partners' written rate cards. A SKU in a
province is priced only once at least two partners' cards exist
("Ready — benchmarked"); otherwise it's quoted. Monthly and long-term hire,
demolition and scheduled waste contracts are always quoted. There are no
self-serve tier discounts on these lines.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from typing import Optional

from calculators.tonnage_volume import to_cents

DATA_PATH = Path(__file__).parent.parent / "data" / "plant_services_catalogue.json"
READY_STATUS = "Ready — benchmarked"
QUOTE_STATUS = "Quote-only — no retail benchmark"
PRICED_BASES = ("DAY", "WEEK")
QUOTE_BASES = ("MONTH", "LONG_TERM")
QUOTE_UNITS = ("QUOTE",)  # demolition, scheduled waste


class PricingNotAvailable(ValueError):
    """No written partner rate for this SKU in this province yet — quote it."""


class QuoteOnly(ValueError):
    """Always quoted: monthly/long-term hire, demolition, mobilisation beyond 100km."""


@dataclass(frozen=True)
class Catalogue:
    raw: dict
    commission: Decimal
    plant: dict[str, dict]
    services: dict[str, dict]
    regions: tuple[str, ...]

    def rate(self, sku: str, region: str) -> dict:
        return self.raw["rates"].get(sku, {}).get(region, {"pricing_status": QUOTE_STATUS})


def load(path: Path = DATA_PATH) -> Catalogue:
    raw = json.loads(path.read_text(encoding="utf-8"))
    return Catalogue(
        raw=raw,
        commission=Decimal(str(raw["commission_percent"])) / 100,
        plant={p["sku"]: p for p in raw["plant"]},
        services={s["sku"]: s for s in raw["services"]},
        regions=tuple(raw["regions"]),
    )


def with_commission(partner_amount: Decimal, commission: Decimal) -> Decimal:
    return to_cents(partner_amount * (1 + commission))


def _dec(value) -> Optional[Decimal]:
    return None if value is None else Decimal(str(value))


def mobilisation_fee(catalogue: Catalogue, distance_km: Decimal) -> Decimal:
    for band in catalogue.raw["mobilisation_bands"]:
        if distance_km >= band["min_km"] and (band["max_km"] is None or distance_km < band["max_km"]):
            if band["is_quote_only"] or band["fee"] is None:
                raise QuoteOnly(f"Low-bed transport at {distance_km}km is quoted with the partner.")
            return Decimal(str(band["fee"]))
    raise QuoteOnly(f"Low-bed transport at {distance_km}km is quoted with the partner.")


def price_rental(
    catalogue: Catalogue,
    sku: str,
    region: str,
    basis: str,
    quantity: int,
    extra_hours: Decimal = Decimal(0),
    distance_km: Optional[Decimal] = None,
) -> dict:
    machine = catalogue.plant.get(sku)
    if machine is None:
        raise KeyError(sku)
    if region not in catalogue.regions:
        raise ValueError(f"Unknown province: {region}")
    if basis in QUOTE_BASES:
        raise QuoteOnly(f"{basis.replace('_', '-').lower()} hire is quoted per project.")
    if basis not in PRICED_BASES:
        raise ValueError(f"Unknown hire basis: {basis}")
    if quantity < 1:
        raise ValueError("Minimum hire is one day.")
    rate = catalogue.rate(sku, region)
    base = _dec(rate.get("partner_day_rate" if basis == "DAY" else "partner_week_rate"))
    if rate["pricing_status"] != READY_STATUS or base is None:
        raise PricingNotAvailable(f"{machine['name']} rates in {region} are being confirmed with our partners — request a quote.")
    hire = base * quantity
    extra = Decimal(0)
    if extra_hours > 0:
        excess = _dec(rate.get("partner_excess_hour_rate"))
        if excess is None:
            raise PricingNotAvailable(f"No excess-hour rate for {machine['name']} in {region} yet — request a quote.")
        extra = excess * extra_hours
    mobilisation = Decimal(0)
    if machine["needs_lowbed"] and distance_km is not None:
        mobilisation = mobilisation_fee(catalogue, distance_km)
    partner_total = hire + extra + mobilisation
    total = with_commission(partner_total, catalogue.commission)
    return {
        "sku": sku,
        "name": machine["name"],
        "region": region,
        "basis": basis,
        "quantity": quantity,
        "hours_cap_per_day": catalogue.raw["hours_per_day_cap"],
        "hire": float(with_commission(hire, catalogue.commission)),
        "extra_hours": float(with_commission(extra, catalogue.commission)),
        "mobilisation": float(with_commission(mobilisation, catalogue.commission)),
        "total": float(total),
        "partner_payout": float(to_cents(partner_total)),
        "aa_commission": float(total - to_cents(partner_total)),
    }


def price_service(catalogue: Catalogue, sku: str, region: str, quantity: Decimal) -> dict:
    service = catalogue.services.get(sku)
    if service is None:
        raise KeyError(sku)
    if region not in catalogue.regions:
        raise ValueError(f"Unknown province: {region}")
    if service["unit"] in QUOTE_UNITS:
        raise QuoteOnly(f"{service['name']} is always quoted per job.")
    if quantity <= 0:
        raise ValueError("Quantity must be greater than zero.")
    rate = catalogue.rate(sku, region)
    partner_rate = _dec(rate.get("partner_rate"))
    if rate["pricing_status"] != READY_STATUS or partner_rate is None:
        raise PricingNotAvailable(f"{service['name']} rates in {region} are being confirmed with our partners — request a quote.")
    partner_total = partner_rate * quantity
    total = with_commission(partner_total, catalogue.commission)
    return {
        "sku": sku,
        "name": service["name"],
        "region": region,
        "unit": service["unit"],
        "quantity": float(quantity),
        "total": float(total),
        "partner_payout": float(to_cents(partner_total)),
        "aa_commission": float(total - to_cents(partner_total)),
    }
