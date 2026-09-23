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

The first version uses a deterministic calculation. It removes an anomalous
monthly sale above three times the median monthly quantity, averages the
remaining history, applies the seasonal and trend factors, then applies an
explicit growth assumption and a documented stockout factor. The resulting
demand over the greater of the lead time and planning horizon is reduced by
on-hand and in-transit quantities, then rounded up to the supplier multiple.

The demo data is synthetic. It also contains an anonymized synthetic customer
transaction used solely to prove that one exceptional purchase does not inflate
regular demand. Stockout correction and lead time are explicit request
assumptions until matching partner source fields are confirmed.
