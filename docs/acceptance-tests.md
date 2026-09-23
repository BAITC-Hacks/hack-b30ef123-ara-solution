# Acceptance tests

## Functional checks

- API responds on health endpoint.
- Frontend loads successfully.
- Backend and frontend communicate through configured base URL.
- Demo data loads without manual database setup.
- User-facing workflow matches documented demo script.

## Replenishment calculation checks

- A recommendation changes when an intended input changes: sales history, seasonal factor, trend assumption, on-hand balance, goods in transit, or supplier lead time.
- A SKU with a demonstrated seasonal pattern is not forecast solely from its all-period average.
- A documented stockout period produces demand no lower than the equivalent calculation from raw observed sales alone.
- A single large purchase by one anonymized customer does not materially raise regular replenishment demand.
- Results list SKU, supplier, recommended quantity, urgency, and a structured explanation; they can be viewed grouped by supplier.
- A user may adjust a recommendation, but an order cannot be sent automatically; export or confirmation requires an explicit user action.
- CSV export is UTF-8 with BOM for Excel compatibility; it rejects negative, fractional, or non-finite quantities, and values with delimiters, quotes, or line breaks remain one correctly escaped CSV field.
- Any quantity adjustment revokes a prior export confirmation and requires a new explicit confirmation.
- The implemented fixture validator reports missing keys, empty sales history, invalid quantities, and duplicate supplier/SKU records instead of silently accepting them; the API returns `SOURCE_DATA_INVALID` with SKU context.
- The future workbook-import validation must additionally report incompatible units and unmatched joins before producing recommendations.

## Contract and regression checks

- Public API responses validate against `api/openapi.yaml`; no frontend code relies on undocumented response fields.
- Deterministic demo fixtures cover the seasonal, stockout, one-off-order, inventory, and in-transit scenarios above.
- Every completed feature links to a demonstrable acceptance check or automated test.

## Non-functional checks

- Services run in Docker Compose without manual code patches.
- Configuration is documented in `.env.example`.
- Docs clearly describe purpose and setup.
