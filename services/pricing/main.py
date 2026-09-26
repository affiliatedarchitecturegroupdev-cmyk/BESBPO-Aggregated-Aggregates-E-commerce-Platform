"""
Aggregated Aggregates — Pricing Microservice

FastAPI service implementing the two calculators that make the storefront's
pricing legible: the bulk/bag tonnage-volume calculator and the
distance-banded delivery calculator. Both are cross-checked against the
pricing engine xlsx to the cent before launch (see roadmap Phase 5 / QA).
"""
import json
from pathlib import Path
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from calculators.delivery_bands import calculate_delivery_fee
from calculators.tonnage_volume import BaggedUnitUnavailable, ProductPricing, calculate

app = FastAPI(
    title="Aggregated Aggregates Pricing Service",
    description="Tonnage/volume + distance-banded delivery calculators.",
    version="0.1.0",
)

DATA_PATH = Path(__file__).parent / "data" / "category_markup_bands.json"
with open(DATA_PATH) as f:
    SEED_DATA = json.load(f)

PRODUCTS_BY_SKU = {p["sku"]: p for p in SEED_DATA["products"]}
TIERS_BY_NAME = {t["name"]: t for t in SEED_DATA["customer_tiers"]}
DELIVERY_BANDS = SEED_DATA["delivery_bands"]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/products")
def list_products():
    return SEED_DATA["products"]


class TonnageVolumeRequest(BaseModel):
    sku: str
    quantity: float
    unit: Literal["ton", "m3", "bag"]
    customer_tier: Literal["RETAIL", "CONTRACTOR_TRADE", "VOLUME_CIVIL_BULK"] = "RETAIL"


@app.post("/calculate/tonnage-volume")
def calculate_tonnage_volume(req: TonnageVolumeRequest):
    product_data = PRODUCTS_BY_SKU.get(req.sku)
    if not product_data:
        raise HTTPException(status_code=404, detail=f"Unknown SKU: {req.sku}")

    tier = TIERS_BY_NAME[req.customer_tier]
    product = ProductPricing(
        sku=product_data["sku"],
        name=product_data["name"],
        bulk_density_kg_per_m3=product_data["bulk_density_kg_per_m3"],
        list_price_per_ton=product_data["list_price_per_ton"],
        bag_premium_multiplier=product_data["bag_premium_multiplier"],
        bag_weight_kg=product_data["bag_weight_kg"],
    )

    try:
        result = calculate(
            product=product,
            quantity=req.quantity,
            unit=req.unit,
            discount_percent=float(tier["discount_percent"]),
        )
    except BaggedUnitUnavailable as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # Volume/Civil Bulk tier orders at/above the m3 threshold are quote-only —
    # flag it here so the frontend can route to the RFQ flow instead of
    # showing a checkout total.
    min_order_m3 = tier.get("minimum_order_m3")
    result["quote_only"] = bool(min_order_m3 and result["equivalent_m3"] >= min_order_m3)

    return result


class DeliveryFeeRequest(BaseModel):
    distance_km: float
    quantity_m3: float


@app.post("/calculate/delivery-fee")
def calculate_delivery(req: DeliveryFeeRequest):
    result = calculate_delivery_fee(
        distance_km=req.distance_km,
        quantity_m3=req.quantity_m3,
        bands=DELIVERY_BANDS,
    )
    return {
        "is_quote_only": result.is_quote_only,
        "reason": result.reason,
        "distance_km": result.distance_km,
        "load_size": result.load_size,
        "fee": result.fee,
    }
