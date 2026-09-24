# Teach&Learn — Global Workspace Rules

Stack: React 19 / Vite / TypeScript / Tailwind (`frontend/`) · Python 3.13 / FastAPI / LangChain / uv (`backend/`) · PostgreSQL / Supabase / RLS (`schema/`, `supabase/functions/`).

## 1. Subsystem Rules
- Frontend → `frontend/AGENTS.md` | Backend → `backend/AGENTS.md`
- Schemas → `schema/AGENTS.md` | Edge Functions → `supabase/functions/AGENTS.md`

## 2. Project Invariants & Pre-Completion Gates
1. **Code Principles**: Apply SRP, DRY, and minimal complexity. Push sorting, filtering, aggregation, and pagination to PostgreSQL.
2. **Strict Type Safety**: Backend — Python 3.13+, Pydantic v2, zero BasedPyright/Ruff warnings. Frontend — `strict: true`, no `any`. Validate at parser boundaries (Pydantic / Zod).
3. **Generated Types Are Read-Only (`db.ts` & `db.py`)**: NEVER edit `frontend/src/types/db.ts` or `backend/src/types/db.py`. Update SQL in `schema/` and regenerate via `scripts/_generate_types.py`. Put app models in `main.ts`, `schemas.py`, or `ai.py`.
4. **Verify Before Done**:
   - **Build & Lint**: Frontend — `npm run build` (0 errors). Backend — `uv run poe lint` (0 Ruff/BasedPyright issues).
   - **Documentation Sync Gate**: Before concluding any feature, workflow, or state-flow change, update all 3 documentation tiers: (1) `systems/*.md`, (2) `systems/workflows/*.md` & `systems/workflows-atomic/*.md`, and (3) `code.ARCH.md` / `code.DESC.md` in every modified directory.

## 3. Documentation Architecture & Docs-First Navigation

### 3.1 Macro Dossier (`systems/`)
- `systems/*.md`: Subsystem blueprints (Frontend, Backend, Database/Storage, AI/Ontology, Edge Functions, DevOps).
- `systems/workflows/*.md` & `systems/workflows-atomic/*.md`: End-to-end user journeys, sequence diagrams, and atomic task specs.
- **Mandatory Multi-File Update**: Any architectural, UX/state-lifecycle (e.g., optimistic UI, progress overlays, rollbacks), schema, endpoint, or edge function change MUST be updated across **all three** `systems/` layers (`systems/*.md`, `systems/workflows/*.md`, and `systems/workflows-atomic/*.md`).

### 3.2 Micro Directory Docs (`code.DESC.md` & `code.ARCH.md`)
- `code.DESC.md`: File roles and flow overview for that directory. Update when adding files or changing file roles.
- `code.ARCH.md`: Interfaces, data lifecycles, state machines, and invariants for that directory. Update whenever a component/hook's data flow, state machine, async/optimistic behavior, or contract changes.
- **Exemptions**: Never create in `docs/`, `plans/`, `systems/`, `public/`, `assets/`, `dist/`, `node_modules/`, `.venv/`, `.scratch/`, or namespace-only dirs (`supabase/`).

### 3.3 Mandatory Docs-First Inspection Order
Before reading or searching any raw source file (`.ts`, `.tsx`, `.py`, `.sql`), first read the Markdown documentation to get the full picture and decide which exact source files to open:
1. **Macro Dossier First**: Read `systems/README.md`, the relevant `systems/*.md` spec, and `systems/workflows/README.md` / `systems/workflows-atomic/README.md` to identify affected directories.
2. **Micro Docs Second**: Read `<target-dir>/code.DESC.md` and `<target-dir>/code.ARCH.md` to identify exact file roles, interfaces, and state machines.
3. **Surgical Source Inspection Last**: Read only the specific source files identified in Step 2. Never blindly search or crawl raw source files to discover how a feature works when the Markdown docs already map it out.

## 4. Workspace Conventions
- **Git**: Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
- **Scratch Space**: Use `./.scratch/` for temporary scripts/data (gitignored; clean up after tasks).
- **Logs**: Inspect only the latest `./logs/*.jsonl` filtered by level (`error`, `warn`) or `X-Request-ID`. Use project loggers (`logger.info/warn/error`); never `console.log`, `print()`, or log PII/secrets.
