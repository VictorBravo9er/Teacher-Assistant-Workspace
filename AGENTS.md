# Teach&Learn — Global Workspace Rules

Stack: React 19 / Vite / TypeScript / Tailwind (frontend) · Python 3.13 / FastAPI / LangChain / uv (backend) · PostgreSQL / Supabase / RLS (data).

## 1. Subsystem Rules Hierarchy
Root rules are universal; subsystems specialize them:
- Frontend → `frontend/AGENTS.md` | Backend → `backend/AGENTS.md`
- Schemas → `schema/AGENTS.md` | Edge Functions → `supabase/functions/AGENTS.md`

## 2. Core Engineering Principles
1. **SRP**: Every module, component, and function has one reason to change. Decouple UI, state, transport, and validation.
2. **DRY**: Single authoritative representation for every schema, type, and business rule. Reuse; never duplicate.
3. **Minimize Complexity**: Prefer explicit, direct code over indirection, premature abstraction, or deep call chains.
4. **Type Safety**: Backend — Python 3.13+, Pydantic v2, zero BasedPyright/Ruff warnings. Frontend — `strict: true`, no `any`.
5. **Generated Types Are Read-Only (`db.ts` & `db.py`)**: NEVER edit `frontend/src/types/db.ts` or `backend/src/types/db.py`. Update via SQL migrations in `schema/` then regenerate with `scripts/_generate_types.py`. App models go in `main.ts`, `schemas.py`, `ai.py`.
6. **Preserve Functionality**: Never regress features, comments, docstrings, or architectural patterns.
7. **Verify Before Done**: Frontend — `npm run build` (zero errors). Backend — `uv run poe lint` (Ruff & BasedPyright clean).

## 3. Codebase Simplification Rules
**Abstraction & Layering**: Remove classes/functions that only forward calls. No trivial single-use helpers. Use FastAPI DI, React hooks/contexts, Vite plugins — don't hand-roll equivalents.

**State & Data Flow**: Prefer derived state over synchronized copies. Use `.map()`, `.filter()`, `.reduce()`, list comprehensions over imperative mutation loops. Replace long `if/else` chains with lookup tables/strategy maps. Push sorting, filtering, aggregation, and pagination to PostgreSQL.

**Types & Contracts**: Use stdlib/platform primitives before pulling dependencies. Make invalid states unrepresentable via discriminated unions. Validate at the parser boundary (Pydantic / Zod) — one schema powers runtime validation, typing, serialization, and API contracts.

**Hygiene**: Delete dead code, unused exports, obsolete feature flags, and commented-out code. Remove packages already covered by stdlib or existing deps. Favor convention over configuration.

## 4. Security & Environment
- Secrets in `.env`, never committed. Use `.env.example` to document required vars.
- Never log or hardcode API keys, auth tokens, or private credentials.

## 5. Directory Docs (`code.DESC.md` & `code.ARCH.md`)
Document source files **directly in that directory only** (not subdirs):
- `code.DESC.md`: Plain-English overview, flow diagrams, application role.
- `code.ARCH.md`: Interfaces, data lifecycles, cross-module dependencies.
- **Exemptions**: Never create in `docs/`, `plans/`, `systems/`, `public/`, `assets/`, `dist/`, `node_modules/`, `.venv/`, `.scratch/`, or namespace-only dirs (`supabase/`).
- **Policy**: Update only on significant architectural redesign or new source files — not for routine fixes.

## 6. Git & Commits
Conventional Commits, atomic and focused:
- `feat: add rubric scoring modal` | `fix: resolve attendance sync bug` | `refactor:` | `docs:` | `chore:`

## 7. Scratch Space (`./.scratch/`)
Use `./.scratch/` for ephemeral analysis, temp scripts, and intermediate data. Create if absent. Excluded by `.gitignore` — never commit; clean up after tasks.

## 8. Reading Logs & Diagnostics
- **Target**: Inspect only the latest `*.jsonl` file in `./logs/`.
- **Querying**: Grep or filter by log level (`error`, `warn`) or correlation ID (`X-Request-ID`) instead of dumping entire files into context.
- **Code Hygiene**: Use project loggers (`logger.info/warn/error`); never `console.log` or `print()`. Never log credentials or student PII.
