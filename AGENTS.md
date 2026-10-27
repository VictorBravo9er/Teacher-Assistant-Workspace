# Teach&Learn — Workspace Rules

Stack: React 19 / Vite / TS / Tailwind (`frontend/`) · Python 3.13 / FastAPI / LangChain / uv (`backend/`) · PostgreSQL / Supabase / RLS (`schema/`, `supabase/functions/`).

## 1. Subsystem Boundaries & Verification
- **Frontend changes**: Run `pnpm run lint` / `pnpm run build` in `frontend/`. Do not run backend checks. Subsystem rules: `frontend/AGENTS.md`.
- **Backend changes**: Run `uv run poe lint` in `backend/`. Do not run frontend checks. Subsystem rules: `backend/AGENTS.md`.
- **Database / Edge Functions**: Apply migrations via `python scripts/migrate.py` or deploy functions via `python scripts/deploy_edge_functions.py`. Subsystem rules: `schema/AGENTS.md`, `supabase/functions/AGENTS.md`.
- **Generated Types Are Read-Only**: Never edit `frontend/src/types/db.ts` or `backend/src/types/db.py`. Update SQL in `schema/` and run `python scripts/_generate_types.py`.

## 2. Documentation Guidelines
- **Core Micro-Docs (`code.md`)**: Maintained only in core architectural `src/` modules. Update `code.md` when adding/removing files or changing interfaces in those directories.
- **Macro Dossier (`systems/*.md`, `systems/workflows/*.md`)**: Consult as an advisory reference when exploring unfamiliar architecture. Update only when altering cross-cutting system designs, schemas, or end-to-end user workflows. Minor bug fixes, UI styling, and local refactors do not require macro-doc edits.

## 3. Workspace Conventions
- **Git**: Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
- **Logs**: Filter `./logs/*.jsonl` by level (`error`, `warn`) or `X-Request-ID`. Use project loggers (`logger.info/warn/error`); never `console.log` or `print()`.
- **Scratch**: Use `./.scratch/` for temp scripts (gitignored).
