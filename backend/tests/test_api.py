from fastapi.testclient import TestClient

from app.main import app
from app.services.replenishment import DemoProduct


client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_calculate_returns_contract_shape() -> None:
    response = client.post(
        "/api/v1/replenishment/calculate",
        json={"supplierScope": "systeme-electric", "asOfDate": "2026-09-22"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["supplierScope"] == "systeme-electric"
    assert payload["groups"][0]["lines"][0]["explanation"]["targetDemand"] >= 0


def test_calculate_rejects_unknown_scope() -> None:
    response = client.post(
        "/api/v1/replenishment/calculate",
        json={"supplierScope": "other", "asOfDate": "2026-09-22"},
    )
    assert response.status_code == 422
    assert response.json()["code"] == "INVALID_REQUEST"


def test_calculate_reports_invalid_source_fixture(monkeypatch) -> None:
    invalid = DemoProduct(
        scope="iek", supplier="IEK", sku="EMPTY", name="Empty sales",
        monthly_sales=[], seasonal_factors={"9": 1},
        on_hand_quantity=0, in_transit_quantity=0, rounding_multiple=1,
        stockout_factor=1, customer_transactions=[],
    )
    monkeypatch.setattr("app.services.replenishment._load_products", lambda: [invalid])

    response = client.post(
        "/api/v1/replenishment/calculate",
        json={"supplierScope": "iek", "asOfDate": "2026-09-22"},
    )

    assert response.status_code == 500
    assert response.json() == {
        "code": "SOURCE_DATA_INVALID",
        "message": "source product #1 (supplier='IEK', sku='EMPTY'): monthly_sales must contain at least one value",
    }
