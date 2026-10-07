import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app  # noqa: E402

client = TestClient(app)


def test_health_reports_workbook_version():
    body = client.get("/health").json()
    assert body["pricing_framework"]["version"] == "1.0"


def test_products_lists_full_catalogue():
    assert len(client.get("/products").json()) == 51  # 48 workbook rows + 3 category-band additions


def test_tonnage_volume_quote_only_is_tier_specific():
    request = {"sku": "AA-SBC-05", "quantity": 12, "unit": "m3"}
    volume = client.post("/calculate/tonnage-volume", json={**request, "customer_tier": "VOLUME_CIVIL_BULK"}).json()
    retail = client.post("/calculate/tonnage-volume", json=request).json()
    assert volume["quote_only"] is True
    assert retail["quote_only"] is False
    assert retail["unit_price"] == 361.08
    assert retail["total"] == 4332.96


def test_unit_not_offered_is_422():
    response = client.post("/calculate/tonnage-volume", json={"sku": "AA-CRS-04", "quantity": 1, "unit": "m3"})
    assert response.status_code == 422


def test_unknown_sku_is_404():
    response = client.post("/calculate/tonnage-volume", json={"sku": "NOPE", "quantity": 1, "unit": "ton"})
    assert response.status_code == 404


def test_delivery_fee_endpoint():
    body = client.post("/calculate/delivery-fee", json={"distance_km": 75, "bulk_m3": 6}).json()
    assert body["is_quote_only"] is False
    assert body["fee"] == 850


def test_order_endpoint_prices_lines_and_delivery():
    body = client.post(
        "/calculate/order",
        json={
            "lines": [{"sku": "AA-DEC-01", "quantity": 10, "unit": "bag"}],
            "distance_km": 12,
            "customer_tier": "RETAIL",
        },
    ).json()
    assert body["is_quote_only"] is False
    assert body["subtotal"] == 412.3
    assert body["delivery"]["fee"] == 350
    assert body["total"] == 762.3


def test_order_endpoint_flags_quote_only_orders():
    body = client.post(
        "/calculate/order",
        json={"lines": [{"sku": "AA-SBC-05", "quantity": 4, "unit": "m3"}], "distance_km": 150},
    ).json()
    assert body["is_quote_only"] is True
    assert body["reason_codes"] == ["OVER_MAX_DISTANCE"]
    assert body["total"] is None
