from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


SupplierScope = Literal["iek", "systeme-electric"]
Urgency = Literal["low", "medium", "high", "critical"]


class CalculationRequest(BaseModel):
    supplierScope: SupplierScope
    asOfDate: date
    planningHorizonDays: int = Field(default=30, ge=1, le=90)
    leadTimeDays: int = Field(default=21, ge=1, le=180)
    growthRate: float = Field(default=0, ge=-0.5, le=2)
    applyStockoutCorrection: bool = True


class RecommendationExplanation(BaseModel):
    baselineMonthlyDemand: float
    seasonalFactor: float
    trendFactor: float
    stockoutFactor: float
    outlierRemovedQuantity: float
    onHandQuantity: float
    inTransitQuantity: float
    targetDemand: float
    roundingMultiple: int
    planningHorizonDays: int
    leadTimeDays: int
    growthRate: float
    dataProvenance: str
    assumptions: list[str]


class RecommendationLine(BaseModel):
    sku: str
    name: str
    recommendedQuantity: int = Field(ge=0)
    urgency: Urgency
    explanation: RecommendationExplanation


class SupplierRecommendationGroup(BaseModel):
    supplier: str
    lines: list[RecommendationLine]


class CalculationResponse(BaseModel):
    asOfDate: date
    supplierScope: SupplierScope
    groups: list[SupplierRecommendationGroup]


class ErrorResponse(BaseModel):
    code: str
    message: str
