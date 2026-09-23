---
name: replenishment-data-contract
description: Inspect and map the IEK or Systeme Electric source spreadsheets for the replenishment MVP. Use when importing, profiling, normalizing, or discussing sales, inventory, seasonality, MOQ, supplier, or in-transit data. Do not use for unrelated spreadsheet work.
---

Treat `IEK/` and `Systeme electric/` as source material, not editable application data.

1. Read the current API contract, methodology, and acceptance tests before proposing a mapping.
2. Establish the grain of every source: one row per sale, SKU-period, SKU-warehouse-period, SKU-supplier, or shipment. Do not join files until the candidate keys and time grain are explicit.
3. Produce or update a data dictionary with source file and sheet, field name, target field, unit, time zone or period convention, key, and known limitation. Mark a missing required source as unresolved; never fabricate stockout, lead time, supplier, or customer information.
4. Preserve source workbooks. Put derived demo fixtures and normalized imports outside the raw source folders, retain source provenance, and use only anonymized customer identifiers.
5. Validate before loading: duplicate keys, missing identifiers, inconsistent SKU formats, unit mismatches, negative quantities, impossible dates, coverage gaps, and unmatched joins.
6. Keep the domain model reproducible. A recommendation must be traceable to its inputs and assumptions; an LLM may phrase an explanation but must not be the calculation authority.

For workbook edits or new workbook artifacts, apply the repository's spreadsheet workflow as well.
