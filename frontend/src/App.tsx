import { useEffect, useRef, useState } from 'react'
import type { CalculationRequest, CalculationResponse, RecommendationLine, SupplierScope, Urgency } from './api'
import { calculateReplenishment } from './api'
import { buildOrderCsv } from './orderExport'

const now = new Date()
const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const initialRequest: Required<CalculationRequest> = {
  supplierScope: 'iek', asOfDate: localDate,
  planningHorizonDays: 30, leadTimeDays: 7, growthRate: 0, applyStockoutCorrection: true,
}
const number = (value: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)
const brands = { iek: 'IEK', 'systeme-electric': 'Systeme Electric' }
const labels: Record<Urgency, string> = { low: 'Норма', medium: 'Внимание', high: 'Срочно', critical: 'Критично' }
const keyOf = (supplier: string, sku: string) => JSON.stringify([supplier, sku])

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    bolt: 'm13 2-9 12h7l-1 8 10-12h-7l1-8Z',
    box: 'm12 3 9 5-9 5-9-5 9-5Zm-9 5v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5',
    truck: 'M1 4h13v13H1V4Zm13 5h4l4 4v4h-8M5 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm13 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
    arrow: 'M4 12h16m-6-6 6 6-6 6',
    download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
    search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
    info: 'M12 11v6m0-10v.1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
    close: 'm6 6 12 12M6 18 18 6',
    check: 'm5 12 4 4L19 6',
    warning: 'm12 3 10 18H2L12 3Zm0 6v5m0 3v.1',
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.info} /></svg>
}

function Explanation({ line, onClose }: { line: RecommendationLine; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { dialog.current?.showModal() }, [])
  const e = line.explanation
  return <dialog ref={dialog} className="explanation-dialog" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }} aria-labelledby="explanation-title">
    <div className="dialog-heading"><div><p className="eyebrow">ПОНЯТНЫЙ РАСЧЁТ · {line.sku}</p><h2 id="explanation-title">Почему столько?</h2><p>{line.name}</p></div><button className="icon-button" onClick={onClose} aria-label="Закрыть объяснение"><Icon name="close" /></button></div>
    <div className="receipt-step blue"><span className="step-number">1</span><div><h3>Сначала — потребность</h3><p>Целевой спрос с учётом параметров расчёта</p><strong>{number(e.targetDemand)} шт.</strong><dl><div><dt>Базовый спрос за месяц</dt><dd>{number(e.baselineMonthlyDemand)} шт.</dd></div><div><dt>Сезонность / тренд</dt><dd>×{number(e.seasonalFactor)} / ×{number(e.trendFactor)}</dd></div><div><dt>Планирование / поставка</dt><dd>{e.planningHorizonDays} / {e.leadTimeDays} дн.</dd></div><div><dt>Дополнительный рост спроса</dt><dd>{number(e.growthRate * 100)}%</dd></div></dl></div></div>
    <div className="receipt-step amber"><span className="step-number">2</span><div><h3>Учитываем отсутствие товара</h3><p>Коэффициент коррекции: <b>×{number(e.stockoutFactor)}</b>. Уже учтён в целевом спросе.</p><p>Исключённый объём выбросов: <b>{number(e.outlierRemovedQuantity)} шт.</b></p></div></div>
    <div className="receipt-step green"><span className="step-number">3</span><div><h3>Вычитаем то, что уже есть</h3><p>На складе {number(e.onHandQuantity)} шт. + в пути {number(e.inTransitQuantity)} шт.</p><strong>−{number(e.onHandQuantity + e.inTransitQuantity)} шт.</strong></div></div>
    <div className="receipt-total"><p>Потребность − остаток − поставки в пути</p><div className="formula">{number(e.targetDemand)} − {number(e.onHandQuantity)} − {number(e.inTransitQuantity)} = {number(e.targetDemand - e.onHandQuantity - e.inTransitQuantity)}</div><p>Отрицательную потребность принимаем за 0. Кратность заказа: {number(e.roundingMultiple)} шт. Итог учитывает ограничения поставщика.</p><div className="final-quantity"><span>Рекомендуем заказать</span><strong>{number(line.recommendedQuantity)} <small>шт.</small></strong></div></div>
    <details className="source-details"><summary>Источник и допущения расчёта</summary><p>{e.dataProvenance}</p><ul>{e.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul></details>
  </dialog>
}

function App() {
  const [request, setRequest] = useState(initialRequest)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<CalculationResponse | null>(null)
  const [error, setError] = useState('')
  const [adjustments, setAdjustments] = useState<Record<string, string>>({})
  const [confirmed, setConfirmed] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<RecommendationLine | null>(null)
  const [help, setHelp] = useState(false)
  const [exported, setExported] = useState(false)
  const rows = result?.groups.flatMap(group => group.lines.map(line => ({ ...line, supplier: group.supplier }))) ?? []
  const quantity = (supplier: string, line: RecommendationLine) => {
    const raw = adjustments[keyOf(supplier, line.sku)]
    return raw === undefined ? line.recommendedQuantity : raw.trim() === '' ? NaN : Number(raw)
  }
  const invalid = rows.some(line => !Number.isSafeInteger(quantity(line.supplier, line)) || quantity(line.supplier, line) < 0)
  const total = rows.reduce((sum, line) => sum + (Number.isFinite(quantity(line.supplier, line)) ? quantity(line.supplier, line) : 0), 0)
  const urgent = rows.filter(line => ['high', 'critical'].includes(line.urgency)).length
  const visible = rows.filter(line => `${line.name} ${line.sku} ${line.supplier}`.toLowerCase().includes(search.toLowerCase()) && (filter === 'all' || ['high', 'critical'].includes(line.urgency)))
  function update(patch: Partial<typeof request>) {
    setRequest(current => ({ ...current, ...patch }))
    setResult(null); setStatus('idle'); setConfirmed(false); setExported(false); setError(''); setSearch(''); setFilter('all')
  }
  async function calculate() {
    setStatus('loading'); setError(''); setConfirmed(false); setExported(false)
    try {
      setResult(await calculateReplenishment(request)); setAdjustments({}); setStatus('success')
    } catch (reason) {
      setResult(null); setError(reason instanceof Error ? reason.message : 'Не удалось связаться с сервером.'); setStatus('error')
    }
  }
  function exportOrder() {
    if (!result || !confirmed || invalid || status !== 'success') return
    try {
      const csv = buildOrderCsv(rows.map(line => ({ ...line, quantity: quantity(line.supplier, line) })))
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url; link.download = `order-${result.supplierScope}-${result.asOfDate}.csv`; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000); setExported(true)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось скачать файл.') }
  }
  return <>
    <header className="topbar"><div className="topbar-inner"><a className="brand" href="#"><span className="brand-icon"><Icon name="bolt" size={24} /></span><span>HackAlem<span className="brand-subtitle">PROCUREMENT</span></span><span className="demo-badge">MVP DEMO</span></a><nav className="brand-tabs" aria-label="Выбор бренда">{(Object.keys(brands) as SupplierScope[]).map(brand => <button key={brand} disabled={status === 'loading'} aria-pressed={request.supplierScope === brand} className={request.supplierScope === brand ? 'active' : ''} onClick={() => update({ supplierScope: brand })}>{brands[brand]}</button>)}</nav><span className={`connection ${status}`}><i />{status === 'success' ? 'API · ответ получен' : status === 'error' ? 'Ошибка расчёта' : status === 'loading' ? 'API · запрос…' : 'API · не проверен'}</span></div></header>
    <main className="page-shell">
      <div className="page-heading"><div><p className="eyebrow">РАБОЧЕЕ МЕСТО ЗАКУПЩИКА</p><h1>Закупки без догадок<span>.</span></h1><p>От остатков на складе до готового заказа — с объяснением каждой цифры.</p></div><button className="secondary help-button" onClick={() => setHelp(!help)} aria-expanded={help}><Icon name="info" />Как это работает</button></div>
      {help && <aside className="help-panel"><strong>Три шага до готового заказа</strong><p>1. Выберите бренд и параметры → 2. Рассчитайте и проверьте позиции → 3. Подтвердите количества и скачайте CSV для Excel.</p><p>«Объяснить» покажет факторы расчёта. Файл содержит все позиции, даже если включён фильтр. Заказ не отправляется поставщику автоматически.</p></aside>}
      <div className="workflow" aria-label="Этапы подготовки заказа"><span className="current"><b>1</b> Настройте расчёт</span><i /><span className={result ? 'current' : ''}><b>2</b> Проверьте рекомендации</span><i /><span className={confirmed ? 'current' : ''}><b>3</b> Скачайте заказ</span></div>
      <form className="settings-card card" onSubmit={event => { event.preventDefault(); void calculate() }}>
        <div className="section-heading"><div className="title-line"><span className="section-number">01</span><h2>Параметры расчёта</h2></div><span className="subtle">Начните с поставщика и периода</span></div>
        <fieldset disabled={status === 'loading'}><div className="control-grid"><label>Поставщик<select value={request.supplierScope} onChange={event => update({ supplierScope: event.target.value as SupplierScope })}>{Object.entries(brands).map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></label><label>Дата для сезонности<input type="date" required value={request.asOfDate} onChange={event => update({ asOfDate: event.target.value })} /></label><label>Период, дней<input type="number" min="1" max="90" required value={request.planningHorizonDays} onChange={event => update({ planningHorizonDays: Number(event.target.value) })} /></label><label>Срок поставки, дней<input type="number" min="1" max="180" required value={request.leadTimeDays} onChange={event => update({ leadTimeDays: Number(event.target.value) })} /></label><button className="primary calculate-button" type="submit"><Icon name="bolt" />{status === 'loading' ? 'Рассчитываем…' : 'Рассчитать закупку'}</button></div>
        <div className="advanced-controls"><label className="growth-label">Рост спроса <span><input aria-label="Рост спроса, процентов" type="number" min="-50" max="200" step="1" required value={Math.round(request.growthRate * 100)} onChange={event => update({ growthRate: Number(event.target.value) / 100 })} /> %</span></label><label className="checkbox-label"><input type="checkbox" checked={request.applyStockoutCorrection} onChange={event => update({ applyStockoutCorrection: event.target.checked })} />Учитывать периоды отсутствия товара</label><span className="subtle">Срок поставки — допущение для демо</span></div></fieldset>
      </form>
      <section className="metrics" aria-label="Сводка заказа"><div className="metric card"><div><p>Всего позиций</p><strong>{result ? rows.length : '—'} <small>SKU</small></strong><span>В расчёте выбранного поставщика</span></div><span className="metric-icon blue"><Icon name="box" size={23} /></span></div><div className="metric card"><div><p>Срочная закупка</p><strong className={urgent ? 'danger-text' : ''}>{result ? urgent : '—'} <small>позиций</small></strong><span>Высокая и критичная срочность</span></div><span className="metric-icon red"><Icon name="warning" size={23} /></span></div><div className="metric card"><div><p>Итоговый объём заказа</p><strong>{result && !invalid ? number(total) : '—'} <small>шт.</small></strong><span>С учётом ваших изменений</span></div><span className="metric-icon green"><Icon name="truck" size={23} /></span></div></section>
      <section className="workbench card" aria-busy={status === 'loading'}><div className="section-heading"><div className="title-line"><span className="section-number">02</span><div><h2>Рекомендации к заказу</h2><p className="subtle">Проверьте цифры. При необходимости измените количество.</p></div></div><span className="table-caption">{brands[result?.supplierScope ?? request.supplierScope]}{result ? ` · ${result.asOfDate}` : ''}</span></div>
        {status === 'idle' && <div className="empty-state"><div className="empty-art"><span className="art-box"><Icon name="box" size={42} /></span><span className="art-check"><Icon name="check" size={18} /></span></div><h3>Здесь начнётся ваш следующий заказ</h3><p>Выберите поставщика и нажмите «Рассчитать закупку».<br />Мы соберём рекомендации и объясним каждую цифру.</p><span className="empty-note"><Icon name="info" size={16} /> Вы решаете, сколько заказать</span></div>}
        {status === 'loading' && <div className="loading-state" role="status"><p>Учитываем спрос, остатки и поставки в пути…</p>{[1, 2, 3, 4].map(i => <div className="skeleton" key={i} />)}</div>}
        {status === 'error' && <div className="empty-state error-state" role="alert"><span className="metric-icon red"><Icon name="warning" size={28} /></span><h3>Не удалось выполнить расчёт</h3><p>{error === 'Failed to fetch' ? 'Сервер недоступен. Проверьте подключение и запуск сервиса.' : error}</p><button className="secondary" onClick={() => void calculate()}>Повторить расчёт</button></div>}
        {status === 'success' && <><div className="table-tools"><label className="search-field"><Icon name="search" size={18} /><input aria-label="Поиск по артикулу или названию" placeholder="Найти по артикулу или названию…" value={search} onChange={event => setSearch(event.target.value)} /></label><div className="filter-tabs"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Все позиции <span>{rows.length}</span></button><button className={filter === 'urgent' ? 'active' : ''} onClick={() => setFilter('urgent')}>Срочные <span>{urgent}</span></button></div></div>
        {visible.length ? <div className="table-scroll"><table><thead><tr><th>Статус</th><th>Товар / артикул</th><th className="numeric">Остаток</th><th className="numeric">В пути</th><th className="numeric">Целевой спрос</th><th className="numeric">К заказу</th><th>Ваша правка</th><th>Почему столько?</th></tr></thead><tbody>{visible.map(line => { const key = keyOf(line.supplier, line.sku); const value = quantity(line.supplier, line); const bad = !Number.isSafeInteger(value) || value < 0; return <tr key={key}><td><span className={`urgency urgency-${line.urgency}`}><i />{labels[line.urgency]}</span></td><td className="product-cell"><strong>{line.name}</strong><span><code>{line.sku}</code> · {line.supplier}</span></td><td className="numeric">{number(line.explanation.onHandQuantity)}</td><td className="numeric transit">{number(line.explanation.inTransitQuantity)}</td><td className="numeric">{number(line.explanation.targetDemand)}</td><td className="numeric recommended">{number(line.recommendedQuantity)}</td><td><input className="quantity-input" aria-label={`Количество ${line.sku}, ${line.supplier}`} aria-invalid={bad} type="number" min="0" step="1" value={adjustments[key] ?? line.recommendedQuantity} onChange={event => { setAdjustments(current => ({ ...current, [key]: event.target.value })); setConfirmed(false); setExported(false) }} /></td><td><button className="explain-button" onClick={() => setSelected(line)}><Icon name="info" size={16} />Объяснить</button></td></tr> })}</tbody></table></div> : <div className="no-results"><Icon name="search" size={28} /><h3>{rows.length ? 'Ничего не найдено' : 'Пока нет рекомендаций'}</h3><p>{rows.length ? 'Попробуйте другой запрос или выберите все позиции.' : 'Измените параметры и повторите расчёт.'}</p></div>}
        <div className="table-bottom"><span>Показано {visible.length} из {rows.length} позиций</span><span><Icon name="info" size={14} /> Количество указано в штуках</span></div></>}
      </section>
      <p className="workspace-note"><Icon name="check" size={15} /> Каждый результат можно проверить. Окончательное решение — за вами.</p>
    </main>
    <footer className="action-footer"><div className="footer-inner"><div className="confirmation"><span className="section-number">03</span><label className="checkbox-label"><input type="checkbox" disabled={!rows.length || status !== 'success' || invalid} checked={confirmed} onChange={event => { setConfirmed(event.target.checked); setExported(false) }} /><span>Я проверил рекомендации и подтверждаю количества<small>{invalid ? 'Введите целые неотрицательные количества во всех позициях.' : exported ? 'Файл заказа подготовлен к скачиванию.' : 'Заказ будет скачан файлом. Отправки поставщику не будет.'}</small></span></label></div><button className="export-button" disabled={!confirmed || invalid || !rows.length || status !== 'success'} onClick={exportOrder}><Icon name="download" />Скачать заказ в CSV</button></div>{error && status === 'success' && <p role="alert">{error}</p>}</footer>
    {selected && <Explanation line={selected} onClose={() => setSelected(null)} />}
  </>
}
export default App
