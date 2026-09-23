# Methodology

## Delivery flow

1. Define problem and constraints.
2. Draft the API contract.
3. Implement backend and frontend in parallel where possible.
4. Seed demo data for testing and validation.
5. Run acceptance checks and demo rehearsal.

## Quality bar

- Contract must be documented before implementation.
- Each feature should be verifiable with a demo or test case.
- Every environment-supported setup should be reproducible.

## MVP replenishment method

The first version uses a deterministic calculation. It supports filtering a
monthly sale above three times the median monthly quantity, averages the
remaining monthly history, applies seasonal and trend factors, then applies an
explicit growth assumption and a documented stockout factor. The resulting
demand over the greater of the lead time and planning horizon is reduced by
on-hand and in-transit quantities, then rounded up to the supplier multiple.

The current demo data is synthetic. Its customer transaction is shown as a
traceability marker in the explanation and does not change the calculated
baseline or recommended quantity. Stockout correction is a synthetic fixture
factor, and lead time is an explicit request assumption until matching partner
source fields are confirmed. The request date selects the seasonal month; it
does not select a historical inventory or in-transit snapshot in this MVP.

Before calculating, the fixture is validated for required identifiers, finite
non-negative quantities, non-empty sales history, positive rounding multiples,
and duplicate supplier/SKU keys. Invalid source data is reported with supplier
and SKU context rather than being silently ignored or causing an arithmetic
error.
