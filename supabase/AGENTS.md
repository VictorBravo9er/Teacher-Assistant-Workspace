# Supabase Rules — PostgreSQL Schemas, Migrations & Edge Functions

Inherits from root `/AGENTS.md`.
Subsystem layout:
- Migrations & Canonical DDL: `supabase/migrations/` (14-digit timestamped `YYYYMMDDHHMMSS_<name>.sql` applied via Supabase CLI)
- Reset Tooling: `supabase/schemas/schema-reset.sql` (database teardown routine)
- Edge Functions: `supabase/functions/<name>/index.ts`; shared utils: `supabase/functions/_shared/`

## 1. Tooling & Verification
- **Migrations & Schemas**: Setup or reset database via `make db-setup` / `make db-reset` (using `scripts/db_setup.py`). Check status via `make migrate-status` and apply incremental SQL migrations via `make migrate` (or `python scripts/migrate.py`, which uses official Supabase CLI `db push`).
- **Contract Synchronization**: After modifying database schema or migrations, regenerate TypeScript and Python contracts via `make types` (or `python scripts/_generate_types.py`). Never edit `frontend/src/types/db.ts` or `backend/src/types/db.py` directly.
- **Edge Functions**: Deploy functions via `make deploy-functions` (or `python scripts/deploy_edge_functions.py`), and audit deployment diffs via `make deploy-functions-status`.

## 2. Database & DDL Invariants
1. **Row Level Security**: Enable RLS on every table with explicit, scoped `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies.
2. **Indexing & Timestamps**: Every foreign key column must have an explicit B-tree index (`idx_<table_name>_<column_name>`). Include `created_at` and `updated_at` with `TIMESTAMPTZ` and wire `trg_<table_name>_updated_at` trigger.
3. **Domain Enums**: PostgreSQL ENUMs are reserved for database domain values only; UI labels, icons, and tooltips belong strictly in frontend contracts.
4. **Identity & Auth**: `auth.users` is the single source of truth for identity. Scoped data access must evaluate `auth.uid()`.

## 3. Edge Functions Invariants
1. **CORS & Preflight**: Handle `OPTIONS` preflights cleanly using `corsHeaders` and return responses via `jsonResponse` from `_shared/cors.ts`.
2. **JWT Authentication**: Validate user JWTs with `supabaseClient.auth.getUser(token)`. Reserve `service_role` client strictly for authorized background/webhook operations.
3. **Configuration & Secrets**: Access environment secrets via `Deno.env.get(...)`. Keep ESM imports lean to minimize cold-start latency.
