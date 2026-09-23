import json
import math
from dataclasses import dataclass
from pathlib import Path
from statistics import median

from app.models import (
    CalculationRequest,
    CalculationResponse,
    RecommendationExplanation,
    RecommendationLine,
    SupplierRecommendationGroup,
)


DEMO_DATA_PATH = Path(__file__).resolve().parents[3] / "data" / "demo" / "replenishment_demo.json"


class SourceDataValidationError(ValueError):
    """A deterministic fixture or future import violates the data contract."""


@dataclass(frozen=True)
class DemoProduct:
    scope: str
    supplier: str
    sku: str
    name: str
    monthly_sales: list[float]
    seasonal_factors: dict[str, float]
    on_hand_quantity: float
    in_transit_quantity: float
    rounding_multiple: int
    stockout_factor: float
    customer_transactions: list[float]


def _load_products() -> list[DemoProduct]:
    payload = json.loads(DEMO_DATA_PATH.read_text(encoding="utf-8"))
    raw_products = payload.get("products") if isinstance(payload, dict) else None
    if not isinstance(raw_products, list):
        raise SourceDataValidationError("demo fixture: products must be a list")

    products: list[DemoProduct] = []
    for position, raw_product in enumerate(raw_products, start=1):
        if not isinstance(raw_product, dict):
            raise SourceDataValidationError(f"source product #{position}: record must be an object")
        supplier = raw_product.get("supplier", "<missing>")
        sku = raw_product.get("sku", "<missing>")
        context = f"source product #{position} (supplier={supplier!r}, sku={sku!r})"
        try:
            products.append(DemoProduct(**raw_product))
        except TypeError as exc:
            raise SourceDataValidationError(f"{context}: required fields are missing or malformed") from exc
    return products


def _is_finite_number(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _validate_products(products: list[DemoProduct]) -> None:
    seen_keys: set[tuple[str, str]] = set()
    allowed_scopes = {"iek", "systeme-electric"}

    for position, product in enumerate(products, start=1):
        context = f"source product #{position} (supplier={product.supplier!r}, sku={product.sku!r})"
        if product.scope not in allowed_scopes:
            raise SourceDataValidationError(f"{context}: unsupported supplier scope {product.scope!r}")
        if not isinstance(product.supplier, str) or not product.supplier.strip():
            raise SourceDataValidationError(f"{context}: supplier is required")
        if not isinstance(product.sku, str) or not product.sku.strip():
            raise SourceDataValidationError(f"{context}: SKU is required")
        if not isinstance(product.name, str) or not product.name.strip():
            raise SourceDataValidationError(f"{context}: name is required")
        if not isinstance(product.monthly_sales, list) or not product.monthly_sales:
            raise SourceDataValidationError(f"{context}: monthly_sales must contain at least one value")
        if any(not _is_finite_number(quantity) or quantity < 0 for quantity in product.monthly_sales):
            raise SourceDataValidationError(f"{context}: monthly_sales must contain finite non-negative quantities")
        if not isinstance(product.seasonal_factors, dict) or any(
            not _is_finite_number(factor) or factor <= 0 for factor in product.seasonal_factors.values()
        ):
            raise SourceDataValidationError(f"{context}: seasonal_factors must contain finite positive values")
        if any(
            not _is_finite_number(quantity) or quantity < 0
            for quantity in (product.on_hand_quantity, product.in_transit_quantity, product.stockout_factor)
        ) or product.stockout_factor <= 0:
            raise SourceDataValidationError(f"{context}: inventory and stockout values must be finite and non-negative")
        if not isinstance(product.rounding_multiple, int) or isinstance(product.rounding_multiple, bool) or product.rounding_multiple <= 0:
            raise SourceDataValidationError(f"{context}: rounding_multiple must be a positive integer")
        if not isinstance(product.customer_transactions, list) or any(
            not _is_finite_number(quantity) or quantity < 0 for quantity in product.customer_transactions
        ):
            raise SourceDataValidationError(f"{context}: customer_transactions must contain finite non-negative quantities")

        key = (product.supplier.strip(), product.sku.strip())
        if key in seen_keys:
            raise SourceDataValidationError(f"{context}: duplicate supplier/SKU key {key!r}")
        seen_keys.add(key)


def _remove_outliers(values: list[float]) -> tuple[list[float], float]:
    """Remove a demonstrably anomalous monthly quantity for the MVP calculation."""
    if not values:
        return [], 0
    reference = median(values)
    cutoff = max(reference * 3, reference + 20)
    filtered = [value for value in values if value <= cutoff]
    removed = sum(values) - sum(filtered)
    return filtered or values, removed


def _customer_outlier_quantity(transactions: list[float], monthly_reference: float) -> float:
    """Exclude a single demonstrative customer transaction from regular demand."""
    cutoff = max(monthly_reference * 3, monthly_reference + 20)
    return sum(quantity for quantity in transactions if quantity > cutoff)


def _trend_factor(values: list[float]) -> float:
    if len(values) < 6:
        return 1
    previous = sum(values[-6:-3]) / 3
    recent = sum(values[-3:]) / 3
    if previous <= 0:
        return 1
    return round(min(1.5, max(0.8, recent / previous)), 3)


def _round_up(quantity: float, multiple: int) -> int:
    if quantity <= 0:
        return 0
    return max(multiple, math.ceil(quantity / multiple) * multiple)


def _urgency(available: float, target: float) -> str:
    if target <= 0 or available >= target:
        return "low"
    coverage = available / target
    if coverage <= 0.25:
        return "critical"
    if coverage <= 0.5:
        return "high"
    return "medium"


def calculate_replenishment(request: CalculationRequest) -> CalculationResponse:
    groups: dict[str, list[RecommendationLine]] = {}
    products = _load_products()
    _validate_products(products)
    for product in products:
        if product.scope != request.supplierScope:
            continue

        filtered_sales, removed_quantity = _remove_outliers(product.monthly_sales)
        baseline = sum(filtered_sales) / len(filtered_sales)
        customer_outlier = _customer_outlier_quantity(product.customer_transactions, baseline)
        seasonal_factor = product.seasonal_factors.get(str(request.asOfDate.month), 1)
        trend_factor = _trend_factor(filtered_sales)
        stockout_factor = product.stockout_factor if request.applyStockoutCorrection else 1
        coverage_days = max(request.planningHorizonDays, request.leadTimeDays)
        target_demand = (
            baseline
            * seasonal_factor
            * trend_factor
            * (1 + request.growthRate)
            * stockout_factor
            * coverage_days
            / 30
        )
        available = product.on_hand_quantity + product.in_transit_quantity
        recommendation = _round_up(target_demand - available, product.rounding_multiple)

        assumptions = [
            f"coverage_days={coverage_days}",
            "outlier_filter=monthly_quantity_above_3x_median",
        ]
        if customer_outlier > 0:
            assumptions.append("customer_transaction_outlier_excluded=demo_fixture")
        if request.applyStockoutCorrection and stockout_factor > 1:
            assumptions.append("stockout_correction=demo_fixture")
        if product.in_transit_quantity > 0:
            assumptions.append("in_transit_quantity_included")

        line = RecommendationLine(
            sku=product.sku,
            name=product.name,
            recommendedQuantity=recommendation,
            urgency=_urgency(available, target_demand),
            explanation=RecommendationExplanation(
                baselineMonthlyDemand=round(baseline, 2),
                seasonalFactor=seasonal_factor,
                trendFactor=trend_factor,
                stockoutFactor=stockout_factor,
                outlierRemovedQuantity=round(removed_quantity + customer_outlier, 2),
                onHandQuantity=product.on_hand_quantity,
                inTransitQuantity=product.in_transit_quantity,
                targetDemand=round(target_demand, 2),
                roundingMultiple=product.rounding_multiple,
                planningHorizonDays=request.planningHorizonDays,
                leadTimeDays=request.leadTimeDays,
                growthRate=request.growthRate,
                dataProvenance="synthetic_demo_fixture",
                assumptions=assumptions,
            ),
        )
        groups.setdefault(product.supplier, []).append(line)

    return CalculationResponse(
        asOfDate=request.asOfDate,
        supplierScope=request.supplierScope,
        groups=[SupplierRecommendationGroup(supplier=supplier, lines=lines) for supplier, lines in groups.items()],
    )
