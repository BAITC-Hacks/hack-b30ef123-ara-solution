# Acceptance tests

## Functional checks

- API responds on health endpoint.
- Frontend loads successfully.
- Backend and frontend communicate through configured base URL.
- Demo data loads without manual database setup.
- User-facing workflow matches documented demo script.

## Non-functional checks

- Services run in Docker Compose without manual code patches.
- Configuration is documented in `.env.example`.
- Docs clearly describe purpose and setup.
