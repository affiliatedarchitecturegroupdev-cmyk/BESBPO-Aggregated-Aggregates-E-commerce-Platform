"""
Aggregated Aggregates — Pricing Microservice

FastAPI service implementing the calculators that make the storefront's
pricing legible: the bulk/bag tonnage-volume calculator, the
distance-banded delivery calculator, and whole-order pricing for checkout.

Every figure comes from data/pricing_framework.json, which is generated
from the pricing framework workbook (scripts/import_pricing_framework.py)
and reconciled against it to the cent by tests/test_reconcile_workbook.py.
"""
from decimal import Decimal
from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

import pricing_framework
from calculators.delivery_bands import calculate_delivery_fee
from calculators.order import OrderLine, UnknownSku, price_order
from calculators.tonnage_volume import UnitNotOffered, calculate

app = FastAPI(
    title="Aggregated Aggregates Pricing Service",
    description="Tonnage/volume, distance-banded delivery, and order pricing.",
    version="0.2.0",
)

FRAMEWORK = pricing_framework.load()

TierName = Literal["RETAIL", "CONTRACTOR_TRADE", "VOLUME_CIVIL_BULK"]
UnitName = Literal["ton", "m3", "bag"]


@app.get("/health")
def health():
    return {"status": "ok", "pricing_framework": FRAMEWORK.raw["source"]}


@app.get("/products")
def list_products():
    return FRAMEWORK.raw["products"]


@app.get("/customer-tiers")
def list_customer_tiers():
    return FRAMEWORK.raw["customer_tiers"]


@app.get("/delivery-rules")
def delivery_rules():
    return FRAMEWORK.raw["delivery"]


def _product(sku: str):
    product = FRAMEWORK.products.get(sku)
    if product is None:
        raise HTTPException(status_code=404, detail=f"Unknown SKU: {sku}")
    return product


class TonnageVolumeRequest(BaseModel):
    sku: str
    quantity: Decimal = Field(gt=0)
    unit: UnitName
    customer_tier: TierName = "RETAIL"


@app.post("/calculate/tonnage-volume")
def calculate_tonnage_volume(req: TonnageVolumeRequest):
    product = _product(req.sku)
    tier = FRAMEWORK.tiers[req.customer_tier]
    try:
        result = calculate(product, req.quantity, req.unit, tier.discount)
    except (UnitNotOffered, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    body = result.as_dict()
    # Only the Volume/Civil Bulk tier has a quote-only m3 threshold; flag it
    # so the storefront routes to the RFQ flow instead of showing a total.
    body["quote_only"] = tier.quote_only_min_m3 is not None and result.equivalent_m3 >= tier.quote_only_min_m3
    return body


class DeliveryFeeRequest(BaseModel):
    distance_km: Decimal = Field(ge=0)
    bulk_m3: Decimal = Field(default=Decimal(0), ge=0)
    bulk_tons: Decimal = Field(default=Decimal(0), ge=0)
    bagged_kg: Decimal = Field(default=Decimal(0), ge=0)
    customer_tier: TierName = "RETAIL"


@app.post("/calculate/delivery-fee")
def calculate_delivery(req: DeliveryFeeRequest):
    tier = FRAMEWORK.tiers[req.customer_tier]
    try:
        result = calculate_delivery_fee(
            FRAMEWORK.delivery,
            distance_km=req.distance_km,
            bulk_m3=req.bulk_m3,
            bulk_tons=req.bulk_tons,
            bagged_kg=req.bagged_kg,
            quote_only_min_m3=tier.quote_only_min_m3,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return result.as_dict()


class OrderLineRequest(BaseModel):
    sku: str
    quantity: Decimal = Field(gt=0)
    unit: UnitName


class OrderRequest(BaseModel):
    lines: list[OrderLineRequest] = Field(min_length=1)
    distance_km: Decimal = Field(ge=0)
    customer_tier: TierName = "RETAIL"


@app.post("/calculate/order")
def calculate_order(req: OrderRequest):
    try:
        result = price_order(
            FRAMEWORK,
            [OrderLine(sku=line.sku, quantity=line.quantity, unit=line.unit) for line in req.lines],
            distance_km=req.distance_km,
            customer_tier=req.customer_tier,
        )
    except UnknownSku as exc:
        raise HTTPException(status_code=404, detail=f"Unknown SKU: {exc.args[0]}")
    except (UnitNotOffered, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return result.as_dict()
