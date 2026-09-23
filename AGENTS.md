# AGENTS

## Purpose and scope

This is a demo-oriented MVP for explaining and preparing supplier replenishment orders. The core flow is: sales history, stock, stockout periods, in-transit supply, seasonality/trend, and supplier constraints produce reviewable SKU recommendations, grouped by supplier.

The supplied Excel workbooks under `IEK/` and `Systeme electric/` are source material. Treat them as read-only inputs; do not overwrite, normalize in place, or present them as synthetic demo data. Keep derived/demo fixtures separate from source data and record their provenance and as-of date.

The recommendation engine must be deterministic and explainable. A result must expose the inputs/adjustments that materially affected it (for example forecast, available stock, in-transit quantity, lead time, MOQ/rounding, stockout or outlier adjustment). An LLM may explain a result, but must not be the sole source of a purchase quantity.

## Contract, data, and documentation invariants

1. `api/openapi.yaml` is the versioned API source of truth. Update it in the same change as any externally visible request, response, status, or endpoint change; frontend and backend must match it.
2. Preserve traceability from a recommendation to its source data and calculation assumptions. Do not silently discard missing, malformed, or unmatched source rows; surface or document the chosen handling.
3. Keep real/source data, generated demo fixtures, and runtime state in separate locations. Do not commit secrets or put credentials in sample data.
4. Keep `.env` local and update `.env.example` plus the relevant setup documentation when environment variables change.
5. Keep `README.md`, `docs/architecture.md`, `docs/methodology.md`, `docs/demo-script.md`, and `docs/acceptance-tests.md` aligned with implemented behavior. Do not claim functionality that is not runnable and verified.

## Required validation gates

Before a feature is complete:

- Update the applicable acceptance criteria in `docs/acceptance-tests.md` and run the relevant automated checks or a reproducible manual check.
- For calculation changes, cover normal demand and the affected business rule: seasonality/trend, stockout, one-off large-sale/outlier handling, current stock, in-transit stock, MOQ/rounding, or supplier grouping.
- Verify response shape against `api/openapi.yaml` and the UI flow against `docs/demo-script.md` when either side is affected.
- Verify a clean local Docker Compose run when the stack or its configuration changes: copy `.env.example` to `.env`, then run `docker compose up --build`.
- Record any unreproducible assumption or known limitation in the relevant documentation; do not hide it behind a default.

## Shared ownership and agent workflow

- Make small, reviewable, clearly named commits. Do not reformat or overwrite unrelated work in a dirty tree.
- Declare ownership of the files you edit before parallel work. An agent may inspect shared files, but must not modify a file owned by another active agent without coordination.
- Contract changes are coordinated first: agree and edit `api/openapi.yaml`, then implement consumers. The author of a change fixes regressions in its owned area.
- Give each subagent one bounded deliverable and explicit file scope. Research/review subagents are read-only unless asked to edit; implementation subagents run focused tests and report commands, results, assumptions, and changed files.
- Assign an independent test/review subagent to validate changed behavior against acceptance criteria and the documented demo flow. It should report defects rather than silently broadening the implementation scope.

## Local run

```bash
cp .env.example .env
docker compose up --build
```

Use the demo script and architecture notes to guide validation.
