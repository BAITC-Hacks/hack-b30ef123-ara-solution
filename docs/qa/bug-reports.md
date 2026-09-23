# Prepared defect reports

These are local drafts, not published GitHub Issues. On 2026-09-23, the successful all-state issue query for `BAITC-Hacks/hack-b30ef123-ara-solution` returned no issues. Repeat that check before publication. Tested SHA: `cb3815a5cbdf0d69f3035134f83271f9e30379f9`.

## QA-001 — CSV export accepts negative and fractional unit quantities

- Requirements: 9 (human review), 10 (export). Suggested priority: high.
- Affected code: `frontend/src/App.tsx`, adjustment handler and `exportOrder`.
- Reproduction: calculate a synthetic IEK line with recommended quantity 10; set reviewed quantity to `-5` (repeat with `1.5`); explicitly confirm; export.
- Actual: download is created with row `IEK;QA-001;Synthetic QA item;-5;low` or quantity `1.5`. A `min=0` input attribute does not validate this standalone button handler.
- Expected: no download; display validation feedback until the reviewed unit quantity is a finite nonnegative integer. API recommendation quantities are integers and UI units are pieces.
- Regression: `node --test --test-name-pattern="invalid adjusted" tests/frontend-export.test.cjs` — two failing tests.
- Evidence: `frontend-results.txt`. These tests execute actual handlers with simulated state and download APIs, not a browser.
- Proposed fix (not applied): validate all reviewed quantities before export.
- Test PR scope: the invalid-quantity cases and their shared synthetic handler harness in `tests/frontend-export.test.cjs`.

## QA-002 — CSV export does not escape delimiters, newlines or quotes

- Requirement: 10 (export). Suggested priority: medium.
- Affected code: `frontend/src/App.tsx`, CSV `row.join(';')`.
- Reproduction: supply a contract-valid synthetic line with name `Synthetic;split\n"name"`, confirm and export.
- Actual record text:

```text
IEK;QA-001;Synthetic;split
"name";10;low
```

- Expected record text:

```text
IEK;QA-001;"Synthetic;split
""name""";10;low
```

- Impact: downstream CSV consumers read extra fields/records. Current bundled demo names do not contain these characters; OpenAPI permits them.
- Regression: `node --test --test-name-pattern="CSV quotes" tests/frontend-export.test.cjs` — one failing test.
- Proposed fix (not applied): CSV-escape every string field before joining records.
- Test PR scope: the CSV escaping case and shared harness in `tests/frontend-export.test.cjs`.

## QA-003 — Empty sales history crashes recommendation calculation

- Requirements: 1, 2; acceptance criterion that invalid/missing source data is reported. Suggested priority: medium for demo, high before import is enabled.
- Affected code: `backend/app/services/replenishment.py`, division by `len(filtered_sales)`.
- Input: synthetic `QA-SYNTHETIC` product, `monthly_sales=[]`, scope/supplier `iek`/`IEK`, stock and incoming quantities 0, seasonal/stockout factors 1, rounding multiple 10. Request: `{"supplierScope":"iek","asOfDate":"2026-09-22"}`.
- Reproduction: substitute this product into `_load_products` and call `calculate_replenishment`. No source files are changed.
- Actual: `ZeroDivisionError: division by zero`, before any recommendation or source diagnostic is returned.
- Expected: explicitly report missing sales history with SKU context. Test uses a descriptive `ValueError` as the internal validation signal; public error mapping needs developer agreement.
- Regression: `tests/.venv/python.exe -m pytest tests/test_procurement_qa.py -k empty_sales -q` — one failing test.
- Evidence: `backend-results.xml` traceback.
- Proposed fix (not applied): validate source history before calculating the mean and define the source-validation API error behavior.
- Test PR scope: empty-sales regression and shared synthetic fixture in `tests/test_procurement_qa.py`.

## QA-004 — Duplicate source SKU records silently duplicate recommendations

- Requirements: 1, 2; explicit duplicate-record validation acceptance criterion. Suggested priority: high before import is enabled.
- Affected code: `backend/app/services/replenishment.py`, `_load_products` and grouping loop.
- Input: temporary synthetic JSON with two identical `QA-SYNTHETIC` records for IEK. Each has six monthly sales of 100, zero stock/incoming stock, September seasonality 1, stockout factor 1, rounding multiple 10 and no customer transactions.
- Request: `{"supplierScope":"iek","asOfDate":"2026-09-22"}`.
- Reproduction: point `DEMO_DATA_PATH` at that temporary file and calculate. Original demo/source files remain untouched.
- Actual: IEK group contains two `QA-SYNTHETIC` lines, each recommending 100, without a diagnostic. Full output: `duplicate-output.json`.
- Expected: report the duplicate supplier/SKU key before calculation. Do not silently accept or aggregate duplicate copies.
- Regression: `tests/.venv/python.exe -m pytest tests/test_procurement_qa.py -k duplicate_source -q` — one failing test.
- Proposed fix (not applied): validate canonical uniqueness during loading and surface a source diagnostic.
- Test PR scope: duplicate-record regression and synthetic fixture in `tests/test_procurement_qa.py`.
