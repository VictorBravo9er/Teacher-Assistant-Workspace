# Supabase Rules — PostgreSQL Schemas, Migrations & Edge Functions

Inherits from root `/AGENTS.md`.
Subsystem layout:
- Schemas & DDL: `supabase/schemas/` (`schema-db.sql`, `schema-ai.sql`, `schema-langgraph.sql`, `schema-reset.sql`, `bucket-*.sql`)
- Incremental Migrations: `supabase/migrations/` (`<seq>_<name>.sql` applied via Supabase CLI)
- Edge Functions: `supabase/functions/<name>/index.ts`; shared utils: `supabase/functions/_shared/`

## 1. Tooling & Verification
- **Migrations & Schemas**: Apply incremental SQL migrations via `python scripts/migrate.py` (uses official Supabase CLI `db push`).
- **Contract Synchronization**: After modifying database schema or migrations, regenerate TypeScript and Python contracts via `python scripts/_generate_types.py`. Never edit `frontend/src/types/db.ts` or `backend/src/types/db.py` directly.
- **Edge Functions**: Deploy functions via `python scripts/deploy_edge_functions.py` (tracks SHA-256 state and deploys modified functions).

## 2. Database & DDL Invariants
1. **Row Level Security**: Enable RLS on every table with explicit, scoped `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies.
2. **Indexing & Timestamps**: Every foreign key column must have an explicit B-tree index (`idx_<table_name>_<column_name>`). Include `created_at` and `updated_at` with `TIMESTAMPTZ` and wire `trg_<table_name>_updated_at` trigger.
3. **Domain Enums**: PostgreSQL ENUMs are reserved for database domain values only; UI labels, icons, and tooltips belong strictly in frontend contracts.
4. **Identity & Auth**: `auth.users` is the single source of truth for identity. Scoped data access must evaluate `auth.uid()`.

## 3. Edge Functions Invariants
1. **CORS & Preflight**: Handle `OPTIONS` preflights cleanly using `corsHeaders` and return responses via `jsonResponse` from `_shared/cors.ts`.
2. **JWT Authentication**: Validate user JWTs with `supabaseClient.auth.getUser(token)`. Reserve `service_role` client strictly for authorized background/webhook operations.
3. **Configuration & Secrets**: Access environment secrets via `Deno.env.get(...)`. Keep ESM imports lean to minimize cold-start latency.
