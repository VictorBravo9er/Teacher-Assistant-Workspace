# Database & Tooling Automation Scripts

This directory contains automation, initialization, and code-generation scripts used to configure PostgreSQL, initialize LangGraph checkpointers, generate strict TypeScript/Python contracts, and aggregate environment parameters.

---

## 📁 Directory Files

- [`migrate.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/migrate.py): Safe database migration runner. Discovers unapplied SQL scripts in `schema/migrations/`, tracks applied migrations in `public._schema_migrations`, executes DDL with `autocommit=True`, and automatically invokes type generation.
- [`db_setup.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/db_setup.py): Safe database provisioning and schema initialization script. Connects via `psycopg`, applies base schemas idempotently, runs pending migrations via `migrate.py`, skips redundant LangGraph setup when already present (unless `--with-langgraph` is passed), and guards against data loss by requiring `--reset` and explicit confirmation for drops.
- [`_setup_langchain_postgres.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/_setup_langchain_postgres.py): Configures PostgreSQL tables and checkpointers for LangGraph using `PostgresSaver` and `PostgresStore`.
- [`_generate_types.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/_generate_types.py): Invokes the Supabase CLI (`supabase gen types`) against the active PostgreSQL instance to generate TypeScript contracts for `frontend/src/types/db.ts` and Python data models for `backend/src/types/db.py`.
- [`_verify_enum_tooltips.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/_verify_enum_tooltips.py): Audits database enum contracts against pedagogical UI tooltip descriptions in `frontend/src/utils/enumTooltips.ts`.
- [`_env_helper.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/_env_helper.py): Helper module providing centralized loading and resolution of `POSTGRES_URI` and `DB_OPTIONS` from `backend/.env`.
- [`collect_env_files.sh`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/collect_env_files.sh): Shell script that aggregates `.env.local`, `frontend/.env`, and `backend/.env` into a single consolidated root `.env` file for Docker Compose.
- [`.gitignore`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/.gitignore): Ignores localized output and temporary script artifacts.

---

## 🚀 Execution

To safely set up or update the database (non-destructive):
```bash
python scripts/db_setup.py
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
