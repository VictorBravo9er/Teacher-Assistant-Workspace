# Database & Tooling Automation Scripts

This directory contains automation, initialization, and code-generation scripts used to configure PostgreSQL, initialize LangGraph checkpointers, generate strict TypeScript/Python contracts, and aggregate environment parameters.

---

## 📁 Directory Files

- [`migrate.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/migrate.py): Safe database migration runner using the official Supabase CLI (`npx -y supabase db push`, `migration list`, `migration repair`). Tracks applied migrations in Supabase's isolated `supabase_migrations.schema_migrations` schema so the `public` schema is never polluted with helper tables.
- [`deploy_edge_functions.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/deploy_edge_functions.py): Incremental Supabase Edge Functions deployment manager using the Supabase CLI (`npx -y supabase functions list` & `functions deploy`). Computes a composite SHA-256 content hash (`supabase/functions/_shared/` + `supabase/functions/<name>/`) against a local gitignored manifest (`scripts/.edge_functions_state.json`) and remote function state, without creating any tables in PostgreSQL.
- [`db_setup.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/db_setup.py): Safe database provisioning and schema initialization script. Connects via `psycopg`, applies base schemas idempotently, runs pending migrations via `migrate.py`, initializes LangGraph checkpointers, regenerates TypeScript/Python contracts, and deploys modified Supabase Edge Functions (`deploy_edge_functions.py`).
- [`_setup_langchain_postgres.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/_setup_langchain_postgres.py): Configures PostgreSQL tables and checkpointers for LangGraph using `PostgresSaver` and `PostgresStore`.
- [`_generate_types.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/_generate_types.py): Invokes the Supabase CLI (`supabase gen types`) against the active PostgreSQL instance to generate TypeScript contracts for `frontend/src/types/db.ts` and Python data models for `backend/src/types/db.py`.
- [`_verify_enum_tooltips.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/_verify_enum_tooltips.py): Audits database enum contracts against pedagogical UI tooltip descriptions in `frontend/src/utils/enumTooltips.ts`.
- [`_env_helper.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/_env_helper.py): Helper module providing centralized loading and resolution of `POSTGRES_URI`, `DB_OPTIONS`, and `SUPABASE_PROJECT_REF`.
- [`collect_env_files.sh`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/collect_env_files.sh): Shell script that aggregates `.env.local`, `frontend/.env`, and `backend/.env` into a single consolidated root `.env` file for Docker Compose.
- [`.gitignore`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/.gitignore): Ignores localized output and temporary script artifacts.

---

## 🚀 Execution

To safely set up or update the database, types, and modified Edge Functions (non-destructive):
```bash
python scripts/db_setup.py
```

To check or deploy modified Supabase Edge Functions standalone:
```bash
python scripts/deploy_edge_functions.py --status
python scripts/deploy_edge_functions.py
python scripts/deploy_edge_functions.py --force
```

To run incremental schema migrations:
```bash
python scripts/migrate.py
python scripts/migrate.py --status
```

To perform a full destructive database reset (requires explicit confirmation):
```bash
python scripts/db_setup.py --reset
```

To aggregate all modular environment files into the root `.env`:
```bash
./scripts/collect_env_files.sh
```

For execution sequencing and dependency flows, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/code.ARCH.md).
