import assert from 'node:assert/strict'
import test from 'node:test'

import { buildOrderCsv } from '../src/orderExport.ts'

test('rejects negative and fractional quantities before export', () => {
  for (const quantity of [-5, 1.5, Number.NaN]) {
    assert.throws(
      () => buildOrderCsv([{ supplier: 'IEK', sku: 'IEK-001', name: 'Автомат', quantity, urgency: 'high' }]),
      /целым неотрицательным числом/,
    )
  }
})

test('quotes delimiters, line breaks and double quotes in a CSV field', () => {
  const csv = buildOrderCsv([
    {
      supplier: 'IEK',
      sku: 'IEK-001',
      name: 'Synthetic;split\n"name"',
      quantity: 10,
      urgency: 'high',
    },
  ])

  assert.equal(
    csv,
    '\uFEFFПоставщик;SKU;Наименование;Количество;Срочность\nIEK;IEK-001;"Synthetic;split\n""name""";10;high',
  )
})
