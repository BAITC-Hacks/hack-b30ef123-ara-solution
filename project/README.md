# Project Architecture

This repository is organized around a modular full-stack setup with a backend API, frontend application, shared OpenAPI contract, demo data, and documentation.

## Structure

- `backend/` — server-side services, business logic, and integrations
- `frontend/` — web client and UI logic
- `api/` — API specification and contract definitions
- `data/` — sample datasets and reusable templates
- `docs/` — architecture, methodology, demo, and acceptance documentation
- `scripts/` — automation and operational scripts
- `.github/workflows/` — CI/CD pipelines
- `.env.example` — environment variable template
- `docker-compose.yml` — local orchestration for development and demo
- `AGENTS.md` — contributor and workflow guidance

## Suggested workflow

1. Define API contract in `api/openapi.yaml`
2. Implement backend services in `backend/`
3. Build frontend UI in `frontend/`
4. Use `data/demo/` and `data/templates/` for examples and seeded assets
5. Validate with docs in `docs/acceptance-tests.md`
6. Run local environment with Docker Compose

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

Adjust service settings and endpoints according to your deployment needs.
