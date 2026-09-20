# Frontend Rules — React 19 / Vite / TypeScript

Cascades from root `/AGENTS.md`.

## 1. Stack & Invariants
- **Stack**: React 19, Vite, TypeScript (`strict: true`, no `any`), Tailwind CSS, `lucide-react`.
- **Supabase client**: `@supabase/supabase-js` in `src/lib/supabase.ts`. Backend REST clients in `src/services/`.
- **Generated Types Invariant**: NEVER edit `src/types/db.ts`. Custom domain types and UI models go in `src/types/main.ts`.
- **Pre-Completion Check**: `cd frontend && npm run build` — zero TypeScript errors or bundling warnings.

## 2. Directory Structure
```
frontend/src/
├── components/       # Modular UI components (Navigation, Modals, Views, Cards)
│   └── ui/           # Atomic reusable primitives (Button, Badge, Input)
├── contexts/         # React Context providers (ThemeContext, AuthContext)
├── hooks/            # Custom hooks for stateful workflows & data fetching
├── services/         # Typed HTTP clients for FastAPI backend routes
├── lib/              # Supabase client, theme tokens, logger, utilities
└── types/            # Domain interfaces, union types, API response contracts
```

## 3. Component Design & State
- **Single Responsibility**: One clear rendering/interaction purpose per component.
- **Derive State**: Compute values from existing props/state; never store duplicate synced state.
- **Controlled Inputs**: Controlled forms with explicit change handlers.
- **No Inline Style Bloat**: Avoid `style={{ ... }}` unless computing dynamic coordinates/dimensions not expressible via Tailwind.

## 4. Tailwind Consolidation
Tiered pattern — highest reuse wins:
1. **Atomic Primitives** (`components/ui/`): Encapsulate base classes, variant maps (`primary`, `secondary`, `danger`, `ghost`), and sizes.
2. **Global `@apply`** (`index.css`): Page containers, modal backdrops, surface cards (`.card-surface`, `.btn-primary`).
3. **Style Dictionaries** (`lib/themeStyles.ts`): Shared multi-class layout constants.

## 5. UI Element ID Traceability (Mandatory)
- Every interactive element (buttons, inputs, selects, modals, tabs) **must have an explicit `id` attribute**.
- **Pattern**: `<feature-scope>-<action>` (e.g. `sidebar-collapse-btn`, `rag-query-input`).
- **Dynamic items**: suffix with unique key (e.g. `sidebar-class-item-${classItem.id}`).
- **Document** all interactive elements and modals in [`frontend/UI_ELEMENT_IDS.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/UI_ELEMENT_IDS.md).

## 6. Theme & Accessibility
- Light/dark support via Tailwind `dark:` variants and CSS color variables.
- Semantic HTML: `<button>`, `<nav>`, `<aside>`, `<main>`, `<header>`, `<fieldset>`.
- WCAG contrast, keyboard accessibility (`Esc` dismisses modals, `Enter` submits forms, visible focus rings).

## 7. Database Enum Safety & Presentation Dictionaries
1. **Never hardcode** raw string arrays for database enum values. Derive options from `Constants.public.Enums.<enum_name>` in `db.ts`. Domain types must use `Database['public']['Enums'][<enum_name>]`.
2. **Presentation copy** (labels, tooltips) lives in typed dictionaries (`Record<EnumType, string>`) with graceful `snake_case → Title Case` fallbacks. Verify with `scripts/_verify_enum_tooltips.py`.

## 8. Logging & Telemetry
- Logger import: `src/lib/logger.ts`. Diagnostics follow root `AGENTS.md` (read `frontend-*.jsonl`).
