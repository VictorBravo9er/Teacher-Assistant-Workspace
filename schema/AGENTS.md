# Database & Schema Rules — PostgreSQL / Supabase / DDL

Inherits from root `/AGENTS.md`. Files: `schema/schema-db.sql` · `schema/schema-langgraph.sql`.

- **Docs-First Inspection**: Before reading `.sql` files, read `systems/database_and_storage.md` and `schema/code.DESC.md` + `schema/code.ARCH.md`.
- **Pre-Completion Sync**: After any DDL/RPC change, regenerate types (`scripts/_generate_types.py`) and update `systems/database_and_storage.md`, affected `systems/workflows[-atomic]/*.md`, and `schema/code.ARCH.md` / `schema/code.DESC.md`.
- **RLS & DDL Invariants**:
  1. Enable RLS (`ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;`) with explicit `SELECT`/`INSERT`/`UPDATE`/`DELETE` policies on every table.
  2. Index all foreign keys; include `created_at` and `updated_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`); use `snake_case`.
  3. Keep PostgreSQL enums strictly for domain values — UI copy/tooltips belong in the frontend.
  4. Use `auth.users` as the single source of identity (`user_metadata` for preferences; educators are users not in `public.students`).
