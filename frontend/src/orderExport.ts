export interface OrderExportLine {
  supplier: string
  sku: string
  name: string
  quantity: number
  urgency: string
}

const CSV_HEADER = ['Поставщик', 'SKU', 'Наименование', 'Количество', 'Срочность']
const UTF8_BOM = '\uFEFF'

export function validateOrderQuantity(quantity: number, sku: string): void {
  if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity < 0) {
    throw new Error(`Количество для ${sku} должно быть целым неотрицательным числом.`)
  }
}

export function escapeCsvField(value: string | number): string {
  const text = String(value)
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function buildOrderCsv(lines: OrderExportLine[]): string {
  const records = lines.map((line) => {
    validateOrderQuantity(line.quantity, line.sku)
    return [line.supplier, line.sku, line.name, line.quantity, line.urgency]
      .map(escapeCsvField)
      .join(';')
  })

  return `${UTF8_BOM}${[CSV_HEADER.join(';'), ...records].join('\n')}`
}
