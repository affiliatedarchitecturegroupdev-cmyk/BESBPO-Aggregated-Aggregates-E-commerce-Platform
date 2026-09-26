import { Injectable } from "@nestjs/common";

type TonnageVolumeRequest = {
  sku: string;
  quantity: number;
  unit: "ton" | "m3" | "bag";
  customerTier: "RETAIL" | "CONTRACTOR_TRADE" | "VOLUME_CIVIL_BULK";
};

type DeliveryFeeRequest = {
  distanceKm: number;
  quantityM3: number;
};

@Injectable()
export class PricingService {
  private readonly baseUrl = process.env.PRICING_SERVICE_URL ?? "http://localhost:8000";

  async calculateTonnageVolume(req: TonnageVolumeRequest) {
    const response = await fetch(`${this.baseUrl}/calculate/tonnage-volume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku: req.sku,
        quantity: req.quantity,
        unit: req.unit,
        customer_tier: req.customerTier,
      }),
    });
    if (!response.ok) {
      throw new Error(`Pricing service error: ${response.status} ${await response.text()}`);
    }
    return response.json();
  }

  async calculateDeliveryFee(req: DeliveryFeeRequest) {
    const response = await fetch(`${this.baseUrl}/calculate/delivery-fee`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ distance_km: req.distanceKm, quantity_m3: req.quantityM3 }),
    });
    if (!response.ok) {
      throw new Error(`Pricing service error: ${response.status} ${await response.text()}`);
    }
    return response.json();
  }
}
