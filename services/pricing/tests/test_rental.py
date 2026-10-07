"""Plant hire and site services: partner rate x 1.12, quoted until two written partner cards exist."""
import csv
import io
import json
from decimal import Decimal
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from calculators import rental
from main import app

client = TestClient(app)
CATALOGUE = rental.load()
sys_path = Path(__file__).parents[1] / "ratecards"
import sys  # noqa: E402

sys.path.insert(0, str(sys_path))
from load_rate_cards import build_rates  # noqa: E402


def test_storefront_copy_matches_and_nothing_is_priced_yet():
    web = Path(__file__).parents[3] / "apps" / "web" / "src" / "data" / "plant-services-catalogue.json"
    assert json.loads(web.read_text(encoding="utf-8")) == CATALOGUE.raw
    assert len(CATALOGUE.plant) == 18 and len(CATALOGUE.services) == 10
    assert CATALOGUE.raw["rates"] == {}  # no written partner rate card yet — everything is quoted
    assert len(CATALOGUE.regions) == 9
    assert client.post("/calculate/rental", json={"sku": "AA-PLT-TLB-4X4", "region": "Gauteng", "basis": "DAY", "quantity": 2}).status_code == 422
    assert client.post("/calculate/service", json={"sku": "AA-SVC-SKIP-6M3", "region": "Gauteng", "quantity": 1}).status_code == 422


def rows(text: str) -> list[dict]:
    return list(csv.DictReader(io.StringIO(text)))


HEADER = "partner,region,sku,day_rate,week_rate,excess_hour_rate,service_rate,vat_included,valid_from,source_document\n"


def loaded(text: str) -> rental.Catalogue:
    rates, errors = build_rates(CATALOGUE.raw, rows(HEADER + text))
    assert errors == []
    return rental.Catalogue({**CATALOGUE.raw, "rates": rates}, CATALOGUE.commission, CATALOGUE.plant, CATALOGUE.services, CATALOGUE.regions)


def test_two_written_cards_publish_the_median_plus_12_percent():
    cat = loaded(
        "Garlaws,KwaZulu-Natal,AA-PLT-TLB-4X4,2000,9000,250,,no,2026-10-01,GAR-RC-01.pdf\n"
        "Besfleet,KwaZulu-Natal,AA-PLT-TLB-4X4,2300,,,,yes,2026-10-01,BF-RC-01.pdf\n"
    )
    rate = cat.rate("AA-PLT-TLB-4X4", "KwaZulu-Natal")
    assert rate["pricing_status"] == rental.READY_STATUS and rate["cards"] == 2
    assert rate["partner_day_rate"] == 2000.0  # median of 2000 and 2300/1.15 = 2000
    priced = rental.price_rental(cat, "AA-PLT-TLB-4X4", "KwaZulu-Natal", "DAY", 3, Decimal(2))
    assert priced["hire"] == 6720.0  # 3 x 2000 x 1.12
    assert priced["extra_hours"] == 560.0  # 2 x 250 x 1.12
    assert priced["total"] == 7280.0 and priced["partner_payout"] == 6500.0 and priced["aa_commission"] == 780.0
    # Another province, monthly hire, and a single card stay quoted.
    with pytest.raises(rental.PricingNotAvailable):
        rental.price_rental(cat, "AA-PLT-TLB-4X4", "Gauteng", "DAY", 1)
    with pytest.raises(rental.QuoteOnly):
        rental.price_rental(cat, "AA-PLT-TLB-4X4", "KwaZulu-Natal", "MONTH", 1)
    one = loaded("Garlaws,Gauteng,AA-SVC-SKIP-6M3,,,,1800,no,2026-10-01,GAR-RC-02.pdf\n")
    assert one.rate("AA-SVC-SKIP-6M3", "Gauteng")["pricing_status"] == "Provisional — confirm w/ supplier"
    with pytest.raises(rental.PricingNotAvailable):
        rental.price_service(one, "AA-SVC-SKIP-6M3", "Gauteng", Decimal(1))


def test_the_loader_refuses_undocumented_or_always_quoted_rates():
    _, errors = build_rates(CATALOGUE.raw, rows(HEADER + "Garlaws,KwaZulu-Natal,AA-PLT-TLB-4X4,2000,,,,no,,\n"))
    assert "source_document" in errors[0]
    _, errors = build_rates(CATALOGUE.raw, rows(HEADER + "Garlaws,KwaZulu-Natal,AA-SVC-DEMOLITION,,,,5000,no,,quote.pdf\n"))
    assert "always quoted" in errors[0]
    _, errors = build_rates(CATALOGUE.raw, rows(HEADER + "Garlaws,KZN,AA-PLT-TLB-4X4,2000,,,,no,,rc.pdf\n"))
    assert "province" in errors[0]
    with pytest.raises(rental.QuoteOnly):
        rental.price_service(CATALOGUE, "AA-SVC-DEMOLITION", "Gauteng", Decimal(1))
