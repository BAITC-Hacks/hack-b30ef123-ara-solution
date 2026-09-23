---
name: replenishment-verification
description: Verify or review a demand-forecast and supplier-order calculation for this procurement MVP. Use when implementing or testing replenishment logic, recommendation APIs, demo fixtures, or the acceptance flow. Do not use for general UI-only changes.
---

Start with `api/openapi.yaml`, `docs/acceptance-tests.md`, and the relevant data dictionary. Verify behavior with deterministic fixtures rather than plausibility alone.

- Confirm each intended input can affect the recommendation: sales history, seasonal pattern, trend, on-hand inventory, goods in transit, supplier lead time, and configured growth assumptions.
- Use controlled fixture pairs to prove the required properties: a seasonal SKU differs from a flat-average forecast; a stockout increases corrected demand; one large sale to one customer does not materially inflate regular demand; more inventory or in-transit stock does not increase replenishment; and output lines group by supplier.
- Assert every recommendation includes SKU, supplier, recommended quantity, urgency, and structured explanation sufficient to reconstruct the result.
- Cover boundary data: empty and missing optional sources, zero inventory, zero sales, negative or duplicate values, unknown supplier, incompatible units, and rounding or MOQ rules when supported.
- Validate API responses against OpenAPI and run the documented acceptance and demo smoke checks. Report exact commands and failures. Do not silently weaken an assertion because current logic fails it.
- The workflow may prepare an order and export it only after explicit human confirmation. It must never dispatch a supplier order automatically.
