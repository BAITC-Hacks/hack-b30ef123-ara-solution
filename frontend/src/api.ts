export type SupplierScope = 'iek' | 'systeme-electric'
export type Urgency = 'low' | 'medium' | 'high' | 'critical'

export interface CalculationRequest {
  supplierScope: SupplierScope
  asOfDate: string
  planningHorizonDays?: number
  leadTimeDays?: number
  growthRate?: number
  applyStockoutCorrection?: boolean
}

export interface RecommendationExplanation {
  baselineMonthlyDemand: number
  seasonalFactor: number
  trendFactor: number
  stockoutFactor: number
  outlierRemovedQuantity: number
  onHandQuantity: number
  inTransitQuantity: number
  targetDemand: number
  roundingMultiple: number
  planningHorizonDays: number
  leadTimeDays: number
  growthRate: number
  dataProvenance: string
  assumptions: string[]
}

export interface RecommendationLine {
  sku: string
  name: string
  recommendedQuantity: number
  urgency: Urgency
  explanation: RecommendationExplanation
}

export interface SupplierRecommendationGroup {
  supplier: string
  lines: RecommendationLine[]
}

export interface CalculationResponse {
  asOfDate: string
  supplierScope: SupplierScope
  groups: SupplierRecommendationGroup[]
}

interface ApiErrorResponse {
  code: string
  message: string
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return typeof value === 'object' && value !== null
    && typeof (value as ApiErrorResponse).code === 'string'
    && typeof (value as ApiErrorResponse).message === 'string'
}

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
const apiBaseUrl = (configuredApiBaseUrl || 'http://localhost:8000').replace(/\/$/, '')

export async function calculateReplenishment(
  request: CalculationRequest,
): Promise<CalculationResponse> {
  const response = await fetch(`${apiBaseUrl}/api/v1/replenishment/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    let detail: unknown
    try {
      detail = await response.json()
    } catch {
      // The service may return a non-JSON proxy or server error.
    }
    throw new Error(isApiErrorResponse(detail) ? detail.message : `Сервис вернул ошибку ${response.status}.`)
  }

  return (await response.json()) as CalculationResponse
}
