# Procurement QA checks

Use Python 3.14+ and Node.js 24+. From the repository root, with an available Python runtime:

```powershell
python -m venv tests/.venv
tests/.venv/Scripts/python.exe -m pip install -r tests/requirements-qa.txt
tests/.venv/Scripts/python.exe -m pytest backend/tests tests/test_procurement_qa.py -q
npm.cmd --prefix frontend ci --no-audit --no-fund
node --test tests/frontend-export.test.cjs
npm.cmd --prefix frontend run build
```

This session used a portable embedded Python runtime at `tests/.venv/python.exe` because system Python was unavailable; its executable path differs from a normal virtual environment. The runtime is ignored and not part of the PR.

All added inputs are synthetic. Backend tests patch the loader or use a temporary JSON file. Frontend tests transpile the real component and exercise its handlers with simulated React state, API responses and download APIs. They do not verify browser rendering or HTTP integration.

Known failures are deliberate regression assertions for unresolved defects. See `docs/qa/qa-report.md` and `docs/qa/bug-reports.md`; do not weaken them to obtain a green run. The post-edit confirmation policy is recorded as TODO rather than asserted without an agreed requirement.
