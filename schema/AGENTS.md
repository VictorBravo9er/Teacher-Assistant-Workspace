# Database & Schema Rules — PostgreSQL / Supabase / DDL

Inherits from root `/AGENTS.md`. Schema files: `schema/schema-db.sql`, `schema/schema-langgraph.sql`.

- **Verification**: After DDL/RPC changes, apply via `python scripts/migrate.py` and regenerate types via `python scripts/_generate_types.py`.
- **Invariants**:
  1. Enable RLS on every table with explicit `SELECT`/`INSERT`/`UPDATE`/`DELETE` policies.
  2. Index all foreign keys and include `TIMESTAMPTZ` timestamps.
  3. Keep PostgreSQL enums strictly for domain values; UI copy belongs in the frontend.
  4. Use `auth.users` as the single source of identity.
