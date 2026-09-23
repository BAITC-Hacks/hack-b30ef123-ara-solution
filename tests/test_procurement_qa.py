"""Synthetic acceptance checks; unresolved defects intentionally fail."""
from dataclasses import asdict, replace
import json
from pathlib import Path

import pytest
import yaml
from fastapi.testclient import TestClient
from jsonschema import Draft4Validator, FormatChecker

from app.main import app
from app.models import CalculationRequest
from app.services import replenishment as engine

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = yaml.safe_load((ROOT / "api/openapi.yaml").read_text(encoding="utf-8"))
CLIENT = TestClient(app)
REQUEST = {"supplierScope": "iek", "asOfDate": "2026-09-22"}


def assert_schema(payload, name):
    schema = {"$ref": f"#/components/schemas/{name}", "components": CONTRACT["components"]}
    Draft4Validator(schema, format_checker=FormatChecker()).validate(payload)


@pytest.mark.parametrize("scope", ["iek", "systeme-electric"])
def test_response_matches_published_contract(scope):
    response = CLIENT.post("/api/v1/replenishment/calculate", json={**REQUEST, "supplierScope": scope})
    assert response.status_code == 200
    assert_schema(response.json(), "CalculationResponse")


def test_health_matches_published_contract():
    response = CLIENT.get("/health")
    assert response.status_code == 200
    assert_schema(response.json(), "HealthResponse")


@pytest.mark.parametrize("changes", [
    {"supplierScope": "unknown"}, {"asOfDate": "bad-date"},
    {"planningHorizonDays": 0}, {"planningHorizonDays": 91},
    {"leadTimeDays": 0}, {"leadTimeDays": 181},
    {"growthRate": -0.51}, {"growthRate": 2.01},
])
def test_invalid_requests_return_documented_errors(changes):
    response = CLIENT.post("/api/v1/replenishment/calculate", json={**REQUEST, **changes})
    assert response.status_code == 422
    assert_schema(response.json(), "ErrorResponse")


@pytest.fixture
def product():
    return engine.DemoProduct(
        scope="iek", supplier="IEK", sku="QA-SYNTHETIC", name="Synthetic QA item",
        monthly_sales=[100] * 6, seasonal_factors={"9": 1},
        on_hand_quantity=0, in_transit_quantity=0, rounding_multiple=10,
        stockout_factor=1, customer_transactions=[],
    )


def calculate(monkeypatch, product, **changes):
    monkeypatch.setattr(engine, "_load_products", lambda: [product])
    result = engine.calculate_replenishment(CalculationRequest(**{**REQUEST, **changes}))
    return result.groups[0].lines[0]


@pytest.mark.parametrize("field", ["on_hand_quantity", "in_transit_quantity"])
def test_inventory_reduces_order_with_known_oracle(monkeypatch, product, field):
    assert calculate(monkeypatch, product).recommendedQuantity == 100
    assert calculate(monkeypatch, replace(product, **{field: 35})).recommendedQuantity == 70
    assert calculate(monkeypatch, replace(product, **{field: 200})).recommendedQuantity == 0


def test_growth_and_rounding_known_oracle(monkeypatch, product):
    line = calculate(monkeypatch, product, growthRate=0.21)
    assert line.explanation.targetDemand == 121
    assert line.recommendedQuantity == 130


def test_zero_sales_does_not_create_order(monkeypatch, product):
    assert calculate(monkeypatch, replace(product, monthly_sales=[0] * 6)).recommendedQuantity == 0


def test_empty_supplier_catalog(monkeypatch):
    monkeypatch.setattr(engine, "_load_products", lambda: [])
    assert engine.calculate_replenishment(CalculationRequest(**REQUEST)).groups == []


def test_empty_sales_reports_validation_error(monkeypatch, product):
    # Acceptance: invalid/missing source quantities must be reported, not crash.
    with pytest.raises(ValueError, match="(?i)(sales|history|empty)"):
        calculate(monkeypatch, replace(product, monthly_sales=[]))


def test_duplicate_source_skus_report_validation_error(monkeypatch, product, tmp_path):
    source = tmp_path / "synthetic-duplicates.json"
    source.write_text(json.dumps({"products": [asdict(product), asdict(product)]}), encoding="utf-8")
    monkeypatch.setattr(engine, "DEMO_DATA_PATH", source)
    with pytest.raises(ValueError, match="(?i)(duplicate|sku)"):
        engine.calculate_replenishment(CalculationRequest(**REQUEST))
