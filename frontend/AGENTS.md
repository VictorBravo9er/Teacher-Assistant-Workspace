# Frontend Rules — React 19 / Vite / TypeScript

Inherits from root `/AGENTS.md`.

## 1. Invariants & Pre-Completion Check
- **Generated Types**: NEVER edit `src/types/db.ts`. Define UI/domain models in `src/types/main.ts`.
- **Docs-First Inspection**: Before reading `.ts`/`.tsx` files, read `systems/frontend_architecture.md`, the relevant workflow in `systems/workflows/README.md`, and `<dir>/code.DESC.md` + `<dir>/code.ARCH.md` to select exact source files.
- **Pre-Completion Check**:
  1. `cd frontend && npm run build` (0 errors).
  2. Sync `systems/frontend_architecture.md`, affected `systems/workflows[-atomic]/*.md`, and modified folders' `code.ARCH.md` / `code.DESC.md`.

## 2. Directory Map
```
frontend/src/
├── components/  # Shared UI (shared/, layout/, ui/)
├── features/    # Domain modules (classroom, students, student-portal, ai-assistant, calendar, account)
├── views/       # Top-level screen shells (ClassApp, StudentApp, AuthPage, LandingPage)
├── contexts/    # React contexts (ThemeContext, AuthContext)
├── hooks/       # Stateful workflow hooks (useClassOperations, useAIChat, useWorkspaceData)
├── services/    # Supabase & FastAPI clients
├── lib/         # Supabase client, theme tokens, logger, calculations
└── types/       # Domain types (main.ts) & read-only DB schema (db.ts)
```

## 3. UI & State Conventions
- **Styling**: Consolidate styles via atomic primitives (`components/ui/`), global utilities (`index.css`), and style dictionaries (`lib/themeStyles.ts`). Avoid inline `style={{ ... }}` unless computing dynamic geometry. Support light/dark mode (`dark:`).
- **UI Element ID Traceability (Mandatory)**: Every interactive element (`button`, `input`, `select`, modal, tab) must have an explicit `id` (`<feature-scope>-<action>`, or suffixed with `-${item.id}` for lists) and be documented in `frontend/UI_ELEMENT_IDS.md`.
- **Database Enum Safety**: Never hardcode DB enum arrays. Derive options from `Constants.public.Enums.<enum_name>` in `db.ts` and type with `Database['public']['Enums'][<enum_name>]`. Store labels/tooltips in typed `Record<EnumType, string>` dictionaries; verify with `scripts/_verify_enum_tooltips.py`.
- **Logging**: Use `src/lib/logger.ts` (`frontend-*.jsonl`).
