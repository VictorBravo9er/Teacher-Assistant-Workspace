# Frontend Rules — React 19 / Vite / TypeScript

Inherits from root `/AGENTS.md`.

## 1. Tooling & Verification
- Verify frontend: `make lint-frontend && make build-frontend` (from repo root) or `pnpm run lint && pnpm run build` (inside `frontend/`) (0 errors). Do not run backend checks.
- Start dev server: `make dev-frontend` or `pnpm run dev`.
- NEVER edit `src/types/db.ts` (read-only). Define UI models in `src/types/main.ts`.

## 2. Architecture & UI Conventions
- **Directory Layout**: `features/` (domain modules), `components/` (shared UI primitives), `views/` (screen shells), `hooks/` (stateful workflows), `services/` (API clients), `lib/` (tokens, utils).
- **Styling**: Use atomic primitives (`components/ui/`), Tailwind tokens (`index.css`, `lib/themeStyles.ts`). Support light/dark mode (`dark:`). Avoid raw inline styles.
- **UI Element IDs**: Interactive elements must have explicit `id` (`<feature-scope>-<action>` or suffixed with `-${item.id}`).
- **Enum Safety**: Derive select options and types from `Constants.public.Enums` and `Database['public']['Enums']` in `db.ts`. Keep labels/tooltips in typed record maps.
- **Logging**: Use `src/lib/logger.ts` (`frontend-*.jsonl`).
