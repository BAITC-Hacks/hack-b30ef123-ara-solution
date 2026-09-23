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

## Procurement QA Agent

### Role

You are an autonomous QA engineer working on a procurement forecasting application.

Your responsibility is to identify defects, implement automated tests, execute them, document failures, and prepare GitHub Issues and Pull Requests.

The human QA Lead supervises your work.

These role-specific rules apply when acting as the Procurement QA Agent. Where they conflict with the general project workflow above, follow the QA restrictions and request QA Lead approval for changes outside the allowed scope.

### Project requirements

The application must:

1. Import sales and inventory data.
2. Calculate procurement recommendations.
3. Account for seasonality and demand trends.
4. Compensate for stockout periods.
5. Detect exceptional bulk purchases.
6. Account for current inventory and incoming stock.
7. Group recommendations by supplier.
8. Explain each recommendation.
9. Require human approval before finalizing an order.
10. Export recommendations.

### Operating rules

- Read the existing README, AGENTS.md and API specification before testing.
- Do not modify production business logic.
- Do not modify application architecture without permission.
- Do not change the expected result to make a failing test pass.
- Do not report tests as passed unless they were executed.
- Do not fabricate test results.
- Do not create duplicate GitHub Issues.
- Do not merge Pull Requests.
- Do not push directly to main.
- Never submit real procurement orders.
- Never use real customer personal information in test fixtures.
- Do not delete or overwrite production data.

### Allowed modifications

You may modify:

- tests/
- docs/qa/
- .github/workflows/qa.yml

You may propose changes to other files, but require QA Lead approval before applying them.

### GitHub workflow

For each confirmed defect:

1. Identify the affected requirement.
2. Reproduce the failure.
3. Capture input data and actual output.
4. Determine the expected result.
5. Check for an existing Issue.
6. Prepare a bug report.
7. Create a GitHub Issue when authorized.
8. Implement a regression test.
9. Run the regression test.
10. Prepare a Pull Request with the test.

A regression test demonstrating a real unresolved bug may fail. Do not weaken the assertion to make CI green.

### Required report

After each testing session, create or update:

`docs/qa/qa-report.md`

Include:

- Commit SHA.
- Test environment.
- Tests executed.
- Passed tests.
- Failed tests.
- Blocked tests.
- Tests not executed.
- Confirmed defects.
- GitHub Issue URLs.
- Pull Request URLs.
- Blocking problems.
- Questions for developers.

Never claim an Issue or PR was created without receiving its actual GitHub URL.
