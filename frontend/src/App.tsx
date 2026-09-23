import { FormEvent, useState } from 'react'
import {
  CalculationRequest,
  CalculationResponse,
  RecommendationExplanation,
  Urgency,
  calculateReplenishment,
} from './api'

type Status = 'idle' | 'loading' | 'success' | 'error'

const today = new Date().toISOString().slice(0, 10)

const initialRequest: Required<CalculationRequest> = {
  supplierScope: 'iek',
  asOfDate: today,
  planningHorizonDays: 30,
  leadTimeDays: 21,
  growthRate: 0,
  applyStockoutCorrection: true,
}

const urgencyLabels: Record<Urgency, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критичный',
}

function number(value: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)
}

function Explanation({ value }: { value: RecommendationExplanation }) {
  const details = [
    ['Базовый спрос / мес.', value.baselineMonthlyDemand],
    ['Сезонный коэффициент', value.seasonalFactor],
    ['Коэффициент тренда', value.trendFactor],
    ['Коррекция stockout', value.stockoutFactor],
    ['Исключённый выброс', value.outlierRemovedQuantity],
    ['Текущий остаток', value.onHandQuantity],
    ['В пути', value.inTransitQuantity],
    ['Целевой спрос', value.targetDemand],
    ['Кратность заказа', value.roundingMultiple],
  ]

  return (
    <details className="explanation">
      <summary>Показать расчёт</summary>
      <dl>
        {details.map(([label, amount]) => (
          <div key={label as string}>
            <dt>{label}</dt>
            <dd>{number(amount as number)}</dd>
          </div>
        ))}
      </dl>
      {value.assumptions && value.assumptions.length > 0 && (
        <ul className="assumptions">
          {value.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
        </ul>
      )}
      <p className="muted">Источник: {value.dataProvenance}; горизонт: {value.planningHorizonDays} дн.; lead time: {value.leadTimeDays} дн.; рост: {value.growthRate * 100}%.</p>
    </details>
  )
}

function App() {
  const [request, setRequest] = useState(initialRequest)
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<CalculationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [adjustments, setAdjustments] = useState<Record<string, number>>({})
  const [confirmed, setConfirmed] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  function updateNumber(field: 'planningHorizonDays' | 'leadTimeDays' | 'growthRate', raw: string) {
    setRequest((current) => ({ ...current, [field]: Number(raw) }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('loading')
    setError(null)
    try {
      const response = await calculateReplenishment(request)
      setResult(response)
      setAdjustments({})
      setConfirmed(false)
      setExportError(null)
      setStatus('success')
    } catch (reason) {
      setResult(null)
      setError(reason instanceof Error ? reason.message : 'Не удалось получить рекомендации.')
      setStatus('error')
    }
  }

  function exportOrder() {
    if (!result || !confirmed) {
      setExportError('Подтвердите заказ перед экспортом.')
      return
    }
    const rows = result.groups.flatMap((group) => group.lines.map((line) => [
      group.supplier,
      line.sku,
      line.name,
      adjustments[line.sku] ?? line.recommendedQuantity,
      line.urgency,
    ]))
    const csv = ['Поставщик;SKU;Наименование;Количество;Срочность', ...rows.map((row) => row.join(';'))].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `order-${result.supplierScope}-${result.asOfDate}.csv`
    link.click()
    URL.revokeObjectURL(url)
    setExportError(null)
  }

  return (
    <main className="page-shell">
      <header className="hero">
        <p className="eyebrow">HackAlem AI · MVP</p>
        <h1>Заказ поставщикам — под контролем</h1>
        <p className="intro">Проверьте объяснимые рекомендации по SKU и подготовьте поставку к согласованию.</p>
      </header>

      <section className="workspace" aria-label="Расчёт пополнения">
        <form className="settings-card" onSubmit={submit}>
          <h2>Параметры расчёта</h2>
          <label>
            Поставщик
            <select
              value={request.supplierScope}
              onChange={(event) => setRequest((current) => ({ ...current, supplierScope: event.target.value as CalculationRequest['supplierScope'] }))}
            >
              <option value="iek">IEK</option>
              <option value="systeme-electric">Systeme Electric</option>
            </select>
          </label>
          <label>
            Дата среза
            <input type="date" value={request.asOfDate} onChange={(event) => setRequest((current) => ({ ...current, asOfDate: event.target.value }))} required />
          </label>
          <label>
            Горизонт планирования, дней
            <input type="number" min="1" max="90" value={request.planningHorizonDays} onChange={(event) => updateNumber('planningHorizonDays', event.target.value)} required />
          </label>
          <label>
            Срок поставки, дней
            <input type="number" min="1" max="180" value={request.leadTimeDays} onChange={(event) => updateNumber('leadTimeDays', event.target.value)} required />
          </label>
          <label>
            Рост спроса, %
            <input type="number" min="-50" max="200" step="1" value={request.growthRate * 100} onChange={(event) => updateNumber('growthRate', Number(event.target.value) / 100 + '')} required />
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={request.applyStockoutCorrection} onChange={(event) => setRequest((current) => ({ ...current, applyStockoutCorrection: event.target.checked }))} />
            Корректировать спрос при отсутствии товара
          </label>
          <button type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Считаем…' : 'Рассчитать заказ'}
          </button>
        </form>

        <section className="results-card" aria-live="polite">
          {status === 'idle' && (
            <div className="empty-state"><span>01</span><h2>Готово к расчёту</h2><p>Выберите параметры слева, чтобы увидеть рекомендации по поставщикам.</p></div>
          )}
          {status === 'loading' && (
            <div className="empty-state"><span className="spinner" aria-hidden="true" /><h2>Собираем рекомендации</h2><p>Учитываем продажи, остатки, товары в пути и ограничения поставщика.</p></div>
          )}
          {status === 'error' && (
            <div className="error-state"><h2>Расчёт не выполнен</h2><p>{error}</p><p className="muted">Проверьте, что API запущен и адрес VITE_API_BASE_URL указан верно.</p></div>
          )}
          {status === 'success' && result && (
            <>
              <div className="results-heading"><div><p className="eyebrow">Дата среза: {result.asOfDate}</p><h2>Рекомендации к заказу</h2></div><span>{result.groups.reduce((total, group) => total + group.lines.length, 0)} SKU</span></div>
              {result.groups.length === 0 ? <p className="no-lines">Для выбранных параметров рекомендации отсутствуют.</p> : result.groups.map((group) => (
                <section className="supplier-group" key={group.supplier}>
                  <h3>{group.supplier}</h3>
                  <div className="recommendations">
                    {group.lines.map((line) => (
                      <article className="recommendation" key={`${group.supplier}-${line.sku}`}>
                        <div className="line-top"><div><p className="sku">{line.sku}</p><h4>{line.name}</h4></div><span className={`urgency urgency-${line.urgency}`}>{urgencyLabels[line.urgency]}</span></div>
                        <div className="quantity"><strong>{number(line.recommendedQuantity)}</strong><span>шт. к заказу</span></div>
                        <label className="adjustment-label">
                          Количество после проверки
                          <input
                            type="number"
                            min="0"
                            value={adjustments[line.sku] ?? line.recommendedQuantity}
                            onChange={(event) => setAdjustments((current) => ({ ...current, [line.sku]: Number(event.target.value) }))}
                          />
                        </label>
                        <Explanation value={line.explanation} />
                      </article>
                    ))}
                  </div>
                </section>
              ))}
              <section className="export-panel">
                <label className="checkbox-label">
                  <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
                  Я проверил(а) количества и подтверждаю подготовку заказа
                </label>
                <button type="button" onClick={exportOrder}>Экспортировать CSV</button>
                {exportError && <p className="export-error">{exportError}</p>}
              </section>
            </>
          )}
        </section>
      </section>
    </main>
  )
}

export default App
