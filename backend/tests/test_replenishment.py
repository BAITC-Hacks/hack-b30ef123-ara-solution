from datetime import date
from dataclasses import replace

from app.models import CalculationRequest
from app.services.replenishment import DemoProduct, calculate_replenishment


def request(**overrides: object) -> CalculationRequest:
    payload: dict[str, object] = {
        "supplierScope": "iek",
        "asOfDate": date(2026, 9, 22),
        "planningHorizonDays": 30,
        "leadTimeDays": 21,
    }
    payload.update(overrides)
    return CalculationRequest(**payload)


def lines_for(**overrides: object):
    response = calculate_replenishment(request(**overrides))
    return [line for group in response.groups for line in group.lines]


def test_recommendations_are_grouped_and_explained() -> None:
    response = calculate_replenishment(request())
    assert response.groups[0].supplier == "IEK"
    line = response.groups[0].lines[0]
    assert line.sku
    assert line.explanation.roundingMultiple > 0
    assert line.explanation.targetDemand >= 0


def test_seasonality_changes_the_target_demand() -> None:
    september = lines_for(asOfDate=date(2026, 9, 22))[0]
    january = lines_for(asOfDate=date(2026, 1, 22))[0]
    assert september.explanation.seasonalFactor != january.explanation.seasonalFactor
    assert september.explanation.targetDemand != january.explanation.targetDemand


def test_stockout_correction_increases_target_demand() -> None:
    corrected = lines_for(applyStockoutCorrection=True)[0]
    raw = lines_for(applyStockoutCorrection=False)[0]
    assert corrected.explanation.targetDemand > raw.explanation.targetDemand


def test_customer_outlier_is_removed_from_regular_demand() -> None:
    line = lines_for()[1]
    assert line.explanation.outlierRemovedQuantity > 0
    assert "customer_transaction_outlier_excluded=demo_fixture" in line.explanation.assumptions


def test_customer_outlier_does_not_inflate_recommendation(monkeypatch) -> None:
    product = DemoProduct(
        scope="iek", supplier="IEK", sku="CUSTOMER", name="Customer SKU",
        monthly_sales=[60, 60, 60, 60, 60, 60], seasonal_factors={"9": 1},
        on_hand_quantity=0, in_transit_quantity=0, rounding_multiple=1,
        stockout_factor=1, customer_transactions=[1000],
    )
    monkeypatch.setattr("app.services.replenishment._load_products", lambda: [product])
    with_outlier = lines_for()[0]
    monkeypatch.setattr("app.services.replenishment._load_products", lambda: [replace(product, customer_transactions=[])])
    without_outlier = lines_for()[0]
    assert with_outlier.recommendedQuantity == without_outlier.recommendedQuantity
    assert with_outlier.explanation.outlierRemovedQuantity == 1000


def test_in_transit_and_inventory_reduce_recommendation(monkeypatch) -> None:
    product = DemoProduct(
        scope="iek", supplier="IEK", sku="TRANSIT", name="Transit SKU",
        monthly_sales=[100, 100, 100, 100, 100, 100], seasonal_factors={"9": 1},
        on_hand_quantity=50, in_transit_quantity=0, rounding_multiple=1,
        stockout_factor=1, customer_transactions=[],
    )
    monkeypatch.setattr("app.services.replenishment._load_products", lambda: [product])
    without_transit = lines_for()[0]
    monkeypatch.setattr("app.services.replenishment._load_products", lambda: [replace(product, in_transit_quantity=40)])
    with_transit = lines_for()[0]
    assert with_transit.recommendedQuantity < without_transit.recommendedQuantity


def test_longer_lead_time_increases_target_demand() -> None:
    short = lines_for(leadTimeDays=10)[0]
    long = lines_for(leadTimeDays=60)[0]
    assert long.explanation.targetDemand > short.explanation.targetDemand


def test_trend_changes_recommendation(monkeypatch) -> None:
    growing = DemoProduct(
        scope="iek", supplier="IEK", sku="TREND", name="Trend SKU",
        monthly_sales=[10, 10, 10, 30, 30, 30], seasonal_factors={"9": 1},
        on_hand_quantity=0, in_transit_quantity=0, rounding_multiple=1,
        stockout_factor=1, customer_transactions=[],
    )
    stable = DemoProduct(
        scope="iek", supplier="IEK", sku="STABLE", name="Stable SKU",
        monthly_sales=[10, 10, 10, 10, 10, 10], seasonal_factors={"9": 1},
        on_hand_quantity=0, in_transit_quantity=0, rounding_multiple=1,
        stockout_factor=1, customer_transactions=[],
    )
    monkeypatch.setattr("app.services.replenishment._load_products", lambda: [growing, stable])
    values = {line.sku: line for line in lines_for()}
    assert values["TREND"].explanation.trendFactor > values["STABLE"].explanation.trendFactor
    assert values["TREND"].recommendedQuantity > values["STABLE"].recommendedQuantity
