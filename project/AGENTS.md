# AGENTS

This project follows a structured delivery workflow for an MVP/demo-oriented solution.

## Responsibilities

- Keep the API contract stable and versioned
- Ensure frontend and backend remain aligned with the OpenAPI spec
- Store demo data separately from production data
- Keep docs synchronized with implementation and demo flow
- Prefer reproducible local setup through Docker and environment files

## Working rules

1. Update `api/openapi.yaml` when contract changes.
2. Use `docs/acceptance-tests.md` to validate feature completion.
3. Keep environment variables in `.env` and document values in `.env.example`.
4. Record any setup assumptions in the relevant docs file.
5. Prefer small, reviewable commits and clear naming.

## Local run

```bash
cp .env.example .env
docker compose up --build
```

Use the demo script and architecture notes to guide validation.
