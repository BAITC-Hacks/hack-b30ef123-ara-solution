// Handler regression tests, not browser E2E tests. Run after npm ci in frontend.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('../frontend/node_modules/typescript');

const source = fs.readFileSync(path.join(__dirname, '../frontend/src/App.tsx'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function harness(name = 'Synthetic QA item') {
  const state = [];
  const downloads = [];
  const blobs = [];
  let index = 0;
  const jsx = (type, props) => ({ type, props: props || {} });
  const react = {
    useState(initial) {
      const slot = index++;
      if (!(slot in state)) state[slot] = initial;
      return [state[slot], (next) => {
        state[slot] = typeof next === 'function' ? next(state[slot]) : next;
      }];
    },
  };
  // Synthetic-only fixture. No partner workbook or customer information.
  const response = {
    asOfDate: '2026-09-23', supplierScope: 'iek',
    groups: [{ supplier: 'IEK', lines: [{
      sku: 'QA-001', name, recommendedQuantity: 10, urgency: 'low',
      explanation: {
        baselineMonthlyDemand: 10, seasonalFactor: 1, trendFactor: 1,
        stockoutFactor: 1, outlierRemovedQuantity: 0, onHandQuantity: 0,
        inTransitQuantity: 0, targetDemand: 10, roundingMultiple: 1,
        planningHorizonDays: 30, leadTimeDays: 21, growthRate: 0,
        dataProvenance: 'synthetic_qa_fixture_2026-09-23', assumptions: [],
      },
    }] }],
  };
  const context = {
    exports: {}, Date, Intl, Blob,
    require(moduleName) {
      if (moduleName === 'react') return react;
      if (moduleName === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (moduleName === './api') return { calculateReplenishment: async () => response };
      throw new Error(`Unexpected import: ${moduleName}`);
    },
    URL: {
      createObjectURL(blob) { blobs.push(blob); return 'blob:qa'; },
      revokeObjectURL() {},
    },
    document: {
      createElement(tag) {
        assert.equal(tag, 'a');
        return { click() { downloads.push(this.download); } };
      },
    },
  };
  vm.runInNewContext(compiled, context);
  function nodes(node) {
    if (Array.isArray(node)) return node.flatMap(nodes);
    if (!node || typeof node !== 'object') return [];
    return [node, ...nodes(node.props?.children)];
  }
  function find(type, predicate = () => true) {
    index = 0;
    const found = nodes(context.exports.default()).find(
      (node) => node.type === type && predicate(node.props),
    );
    assert.ok(found, `Expected ${type} in rendered component tree`);
    return found.props;
  }
  return {
    downloads, blobs,
    calculate: () => find('form').onSubmit({ preventDefault() {} }),
    confirm() {
      const label = find('label', (props) => nodes(props.children).some(
        (node) => node.type === 'input' && node.props.type === 'checkbox',
      ) && String(props.children).includes('подтверждаю'));
      nodes(label.children).find((node) => node.type === 'input').props.onChange({ target: { checked: true } });
    },
    adjust: (value) => find('input', (props) => props.type === 'number' && props.min === '0')
      .onChange({ target: { value: String(value) } }),
    export: () => find('button', (props) => props.type === 'button').onClick(),
  };
}

test('export requires explicit confirmation', async () => {
  const app = harness();
  await app.calculate();
  app.export();
  assert.equal(app.downloads.length, 0);
  app.confirm();
  app.export();
  assert.equal(app.downloads.length, 1);
});

test('successful recalculation clears previous confirmation', async () => {
  const app = harness();
  await app.calculate();
  app.confirm();
  app.export();
  assert.equal(app.downloads.length, 1);
  await app.calculate();
  app.export();
  assert.equal(app.downloads.length, 1);
});

for (const quantity of [-5, 1.5]) {
  test(`export rejects invalid adjusted unit quantity ${quantity}`, async () => {
    const app = harness();
    await app.calculate();
    app.adjust(quantity);
    app.confirm();
    app.export();
    const csv = app.blobs.length ? await app.blobs.at(-1).text() : '';
    assert.equal(app.downloads.length, 0, `Invalid quantity exported:\n${csv}`);
  });
}

test('CSV quotes names containing delimiters, newlines, and quotes', async () => {
  const app = harness('Synthetic;split\n"name"');
  await app.calculate();
  app.confirm();
  app.export();
  assert.equal(app.downloads.length, 1);
  const csv = await app.blobs[0].text();
  assert.equal(csv.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trimEnd(),
    'Поставщик;SKU;Наименование;Количество;Срочность\nIEK;QA-001;"Synthetic;split\n""name""";10;low');
});

test.todo('Requirement question: must editing quantities revoke an earlier confirmation?');
