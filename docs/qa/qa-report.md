# Procurement QA report — 2026-09-23

## Revision and environment

- Tested commit: `cb3815a5cbdf0d69f3035134f83271f9e30379f9` on an initially clean working tree; new QA files were uncommitted during execution.
- Windows / PowerShell; Node.js `v24.21.0`; frontend dependencies installed from `frontend/package-lock.json` using `npm.cmd ci --no-audit --no-fund`.
- Python `3.14.0` official embedded runtime installed locally in ignored `tests/.venv/`; pip `26.2.1`. Backend pinned requirements plus PyYAML `6.0.3` and jsonschema `4.26.0`. Full resolved packages: [python-environment.txt](python-environment.txt).
- Tests use synthetic fixtures and an in-process FastAPI TestClient. Frontend tests execute actual transpiled App handlers with mocked React state, API responses and download APIs. They are not browser E2E tests.
- Production code, partner workbooks, API contract and environment configuration were not modified. No orders were submitted.

## Executed checks

| Command | Result |
| --- | --- |
| `tests/.venv/python.exe -m pytest backend/tests tests/test_procurement_qa.py -q --junitxml=docs/qa/backend-results.xml` | **27 passed, 2 failed**, exit 1 |
| `node --test tests/frontend-export.test.cjs` | **2 passed, 3 failed, 1 TODO**, exit 1 |
| `npm.cmd run build` in `frontend/` | **Passed**: TypeScript and Vite production build |
| `git diff --check` | Passed for tracked diff; new files were untracked at execution |
| GitHub CLI `issue list --repo BAITC-Hacks/hack-b30ef123-ara-solution --state all --limit 100 --json number,title,url,state` | Successful read, returned `[]`; no existing issues |

Total automated test outcomes: **29 passed, 5 failed, 1 TODO**. Five failures represent four confirmed defects. Existing backend tests: **11/11 passed**. Added backend tests: **16 passed, 2 failed**. Added frontend tests: **2 passed, 3 failed, 1 TODO**.

Evidence: [backend JUnit results](backend-results.xml), [frontend test output](frontend-results.txt), [duplicate SKU actual output](duplicate-output.json). Failures remain active assertions, not expected-failure markers.

## Passed coverage

- Health endpoint and both supplier response bodies validate against the published OpenAPI schemas. Schema validation uses Draft 4 for the subset used by this contract, including date format checking; this is not full OpenAPI document linting.
- Unknown supplier, malformed date and out-of-range horizon, lead time and growth return the documented 422 error shape.
- Existing tests cover seasonality, trend, stockout correction, synthetic customer outlier behavior, incoming stock and lead time.
- New controlled-oracle checks cover on-hand and incoming stock independently, zero sales, an empty supplier catalog, growth and rounding.
- Frontend handlers block export before confirmation and reset confirmation after a successful recalculation.
- Frontend compiles and builds. Static independent review found frontend API fields aligned with the contract.

## Confirmed defects

| ID | Requirements | Observed result | Expected result |
| --- | --- | --- | --- |
| QA-001 | 9, 10: reviewed order/export | Adjustments `-5` and `1.5` are exported as unit quantities after confirmation. | Reject invalid unit quantities before generating a CSV. |
| QA-002 | 10: export | Name `Synthetic;split\n"name"` produces extra fields/records. | Preserve the name in one field using CSV quoting and quote escaping. |
| QA-003 | 1, 2: source validation/calculation | Synthetic product with `monthly_sales=[]` raises `ZeroDivisionError`. | Report missing sales history through explicit validation, with SKU context, rather than arithmetic failure. |
| QA-004 | 1, 2: source validation/calculation | Two identical supplier/SKU records produce two recommendation lines of 100 each without warning. | Report duplicate source keys before producing recommendations. |

QA-003 and QA-004 are reproduced against injected synthetic engine/loader inputs; the bundled valid demo fixture does not trigger them. Source import is not implemented, so these do not establish a live upload-path failure. The acceptance criteria nevertheless explicitly require source validation.

Issue-ready reports and individual PR scope proposals: [bug-reports.md](bug-reports.md). Combined local PR draft: [pr-draft.md](pr-draft.md).

## Blocked and not executed

- Docker Compose smoke test: blocked; `docker` is not available in this environment.
- Browser rendering, real browser downloads, frontend/backend HTTP integration, CORS behavior and the complete interactive demo: not executed. Build success and handler tests do not prove these flows.
- Real workbook import, unmatched joins, incompatible units, missing source keys and general negative-value handling: not executed. Import remains a documented unimplemented feature, so requirement 1 is incomplete.
- As-of inventory snapshot selection: not verified; only seasonal month behavior is covered. API describes snapshot selection while runtime uses a fixed synthetic fixture.
- Full MOQ semantics: not verified; documented MVP behavior only rounds to multiples.
- No real supplier dispatch or customer data tests were attempted.

Initial setup failures were resolved: README's Python path did not exist; Windows Python aliases were unusable; frontend compiler was absent. Approved downloads supplied isolated Python and locked frontend dependencies. Sandbox blocked npm network access and Vite parent-directory access; approved retries succeeded. A Starlette/httpx deprecation warning occurred during pytest but did not prevent execution.

## GitHub status and blocking problems

- GitHub Issue URLs: **none created**. Duplicate check completed; four reports are prepared locally. Publication has not been authorized.
- Pull Request URLs: **none created**. Local draft prepared; no branch was pushed, no PR merged, and no changes pushed to main.
- Five regression failures remain unresolved because QA rules prohibit production-code changes without QA Lead approval. No production fix was attempted.
- Docker and browser acceptance remain outstanding; this session does not establish full MVP acceptance.

## Questions for developers / QA Lead

1. Must editing any quantity revoke prior confirmation? Current handlers retain it; a TODO test records this policy question without assuming a new requirement.
2. Confirm the error contract for invalid synthetic/imported source data. Regression tests currently expect an explicit `ValueError` for missing history and duplicate keys; a documented replacement must retain the requirement to surface these problems.
3. Should unsupported as-of snapshot dates be rejected or explicitly disclosed as fixed demo data?
4. When will real import/source validation and browser/Docker acceptance be available?
