# Architecture

## Components

- `frontend/`: React and Vite client. It reads `VITE_API_BASE_URL` and calls the versioned API only.
- `backend/`: FastAPI application with deterministic replenishment calculation.
- `api/openapi.yaml`: the public contract shared by frontend and backend.
- `data/demo/`: synthetic fixtures for the MVP. Partner workbooks in `IEK/` and `Systeme electric/` are read-only source material.
- `docs/reference/`: the original task and planning conversation, kept outside the runtime layout.
- `.agents/` and `.codex/`: project-local delivery harness: skills and subagent profiles.

The repository deliberately has no shared root virtual environment, build directory, or catch-all scripts folder. Python dependencies live in `backend/.venv`; frontend dependencies live in `frontend/node_modules`; both are reproducible and ignored by Git.

## Calculation flow

`demo or normalized input → remove monthly outlier → baseline demand → seasonal and trend factors → stockout adjustment → available stock and in-transit supply → rounding multiple → supplier group`

The first increment stores no user data and has no automatic supplier dispatch. SQLite remains the selected persistence option for the next increment, when imported snapshots and user adjustments need to be retained.
