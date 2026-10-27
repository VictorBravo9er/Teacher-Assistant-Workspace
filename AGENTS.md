# Teach&Learn — Workspace Rules

Stack: React 19 / Vite / TS / Tailwind (`frontend/`) · Python 3.13 / FastAPI / LangChain / uv (`backend/`) · PostgreSQL / Supabase / RLS (`supabase/`).

## 1. Subsystem Boundaries & Verification
Use root `Makefile` automation to execute standard quality gates across subsystems:
- **Full-Suite Check**: Run `make check` (runs backend lint, frontend lint, and doc coverage).
- **Frontend changes**: Run `make lint-frontend` / `make build-frontend` (or `pnpm run lint` / `pnpm run build` in `frontend/`). Do not run backend checks. Subsystem rules: `frontend/AGENTS.md`.
- **Backend changes**: Run `make lint-backend` (or `uv run poe lint` in `backend/`). Do not run frontend checks. Subsystem rules: `backend/AGENTS.md`.
- **Database / Edge Functions**: Initialize or reset database with `make db-setup` / `make db-reset`, check status with `make migrate-status`, apply migrations with `make migrate` (or `python scripts/migrate.py`), dump schemas/data via `make db-dump-schema` / `make db-dump-data` / `make db-dump`, and deploy functions via `make deploy-functions`. Subsystem rules: `supabase/AGENTS.md`.
- **Generated Types Are Read-Only**: Never edit `frontend/src/types/db.ts` or `backend/src/types/db.py`. Update SQL in `supabase/migrations/` and run `make types` (or `python scripts/_generate_types.py`).

## 2. Documentation Guidelines
- **Core Micro-Docs (`code.md`)**: Maintained only in core architectural `src/` modules. Update `code.md` when adding/removing files or changing interfaces in those directories. Audit coverage with `make lint-docs`.
- **Macro Dossier (`docs/systems/*.md`, `docs/systems/workflows/*.md`)**: Consult as an advisory reference when exploring unfamiliar architecture. Update only when altering cross-cutting system designs, schemas, or end-to-end user workflows. Minor bug fixes, UI styling, and local refactors do not require macro-doc edits.

## 3. Workspace Conventions
- **Git**: Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
- **Logs**: Filter `./logs/*.jsonl` by level (`error`, `warn`) or `X-Request-ID`. Use project loggers (`logger.info/warn/error`); never `console.log` or `print()`.
- **Scratch**: Use `./.scratch/` for temp scripts (gitignored).
