# Architecture

This project is organized as a modular monorepo with clear separation between API contract, backend implementation, frontend experience, and operational assets.

## Layers

- API layer: OpenAPI contract stored in `api/openapi.yaml`
- Backend: application logic, domain services, and data access
- Frontend: presentation layer and user interactions
- Data: examples, demos, and reusable templates
- Docs: product, architecture, methodology, runbook, and QA guidance

## Principles

- Keep contracts explicit and versioned.
- Keep UI and backend loosely coupled through the API.
- Separate demo data from production-like data.
- Use environment files and Docker for reproducible setup.
