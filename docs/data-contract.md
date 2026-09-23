# Source data contract

## Scope

The current runtime does not import partner workbooks. A future importer may use
only the top-level workbooks in `IEK/` and `Systeme electric/`; nested folders
with the same names are duplicate copies and must be excluded.

## Canonical keys

Use `Код 1с` / `Номенклатура.Код` as the primary SKU key. `Артикул поставщика`
is secondary. Do not join sources by product name.

## Confirmed sources

- Monthly sales: SKU by month, January 2024 through September 2026.
- Monthly balances: SKU by month over the same period.
- Sales movements: document, SKU, warehouse, quantity; normalize the sign explicitly.
- MOQ or multiplicity: SKU-level candidate rounding constraint.
- In-transit supply: SKU-level quantities; expected dates are incomplete.
- Seasonality: supplier-level monthly summary, not SKU-level.

## MVP assumptions and limitations

- Customer identifiers and confirmed stockout periods are absent. The real-data
  importer must not claim customer-level outlier detection or inferred stockout.
- Supplier lead time is an explicit calculation parameter until a reliable
  supplier reference is provided.
- MOQ and multiplicity semantics need business confirmation before a production
  interpretation. The MVP treats them as a rounding multiple.
- The synthetic fixture in `data/demo/` is for tests and demonstrations only.
