# Database & Tooling Automation Scripts

This directory contains automation, initialization, and code-generation scripts used to configure PostgreSQL, initialize LangGraph checkpointers, generate strict TypeScript/Python contracts, and aggregate environment parameters.

---

## 📁 Directory Files

- [`db_setup.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/db_setup.py): Master database provisioning and reset script. Connects via `psycopg`, executes the full SQL schema reset and table creations in sequence, runs LangGraph table setups, and triggers automatic type generation.
- [`_setup_langchain_postgres.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/_setup_langchain_postgres.py): Configures PostgreSQL tables and checkpointers for LangGraph using `PostgresSaver` and `PostgresStore`.
- [`_generate_types.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/_generate_types.py): Invokes the Supabase CLI (`supabase gen types`) against the active PostgreSQL instance to generate TypeScript contracts for `frontend/src/types/db.ts` and Python data models for `backend/src/types/db.py`.
- [`_env_helper.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/_env_helper.py): Helper module providing centralized loading and resolution of `POSTGRES_URI` and `DB_OPTIONS` from `backend/.env`.
- [`collect_env_files.sh`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/collect_env_files.sh): Shell script that aggregates `.env.local`, `frontend/.env`, and `backend/.env` into a single consolidated root `.env` file for Docker Compose.
- [`.gitignore`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/.gitignore): Ignores localized output and temporary script artifacts.

---

## 🚀 Execution

To reset and rebuild the database schema from scratch:
```bash
python scripts/db_setup.py
```

To aggregate all modular environment files into the root `.env`:
```bash
./scripts/collect_env_files.sh
```

For execution sequencing and dependency flows, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/code.ARCH.md).
