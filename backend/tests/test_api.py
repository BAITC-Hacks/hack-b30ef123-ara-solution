from fastapi.testclient import TestClient

from app.main import app


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
