# Draft PR: Add procurement QA coverage and reproduce four unresolved defects

Reviewed quantities can be exported with negative/fractional values, CSV fields are not escaped, empty sales history crashes calculation, and duplicate source SKU records silently produce duplicate recommendation lines. This QA-only change adds reproducible synthetic regressions and captures their actual failures without changing production behavior.

Adds published-schema response checks, invalid-request boundaries, deterministic stock/growth/rounding checks, and confirmation/export handler tests. The report includes requirement coverage, environment details, evidence and issue-ready descriptions. Source workbooks remain read-only.

Validation at `cb3815a5cbdf0d69f3035134f83271f9e30379f9`:

- Backend: 27 passed, 2 failed.
- Frontend handlers: 2 passed, 3 failed, 1 TODO pending approval-policy clarification.
- Frontend production build passed.
- Docker and full browser demo were not run.

The five failures intentionally expose four unresolved defects; they are not marked xfail or weakened. This is a local PR description only: no remote branch, GitHub Issue or Pull Request has been created. Link authorized Issues before publication; split into individual defect test PRs if desired, using the scopes in `bug-reports.md`.
