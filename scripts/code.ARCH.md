# Scripts Architecture & Execution Lifecycle

This document details the design patterns, execution pipelines, and environmental contracts of the automation scripts in `scripts/`.

---

## 1. Database Provisioning & Schema Synchronization Pipeline

The setup script [`db_setup.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/db_setup.py) and migration tool [`migrate.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/migrate.py) coordinate a safe, non-destructive migration and contract generation workflow:

```mermaid
sequenceDiagram
    autonumber
    participant DBSetup as db_setup.py / migrate.py
    participant Env as _env_helper.py
    participant Postgres as PostgreSQL Database
    participant LangChain as _setup_langchain_postgres.py
    participant TypeGen as _generate_types.py
    participant Filesystem as Frontend/Backend Types

    DBSetup->>Env: Load POSTGRES_URI & DB_OPTIONS
    alt Destructive Reset Requested (--reset)
        DBSetup->>Postgres: Execute schema-reset.sql (Requires confirmation)
    else Safe Provisioning (Default)
        DBSetup->>Postgres: Execute schema-db.sql, bucket-materials.sql, bucket-submissions.sql (Idempotent)
    end
    DBSetup->>Postgres: Check & apply unapplied migrations from schema/migrations/
    opt LangGraph checkpointer missing or --with-langgraph
        DBSetup->>LangChain: setup_database(db_langgraph_url)
        LangChain->>Postgres: PostgresSaver.setup() & PostgresStore.setup()
        DBSetup->>Postgres: Execute schema-langgraph.sql (RLS Policies)
    end
    DBSetup->>TypeGen: generate_types(db_url)
    TypeGen->>Filesystem: Write frontend/src/types/db.ts & backend/src/types/db.py
    TypeGen->>Filesystem: Audit tooltips via _verify_enum_tooltips.py
    DBSetup->>EdgeDeploy: deploy_modified_functions() (Step 6)
    EdgeDeploy->>SupabaseCLI: npx -y supabase functions list & compare SHA-256 vs .edge_functions_state.json
    opt Modified or Undeployed Functions Detected
        EdgeDeploy->>SupabaseCLI: npx -y supabase functions deploy <fn_name>
        EdgeDeploy->>Filesystem: Update scripts/.edge_functions_state.json
    end
```

---

## 2. Key Modules & Design Decisions

### Accidental Data Loss Prevention:
In [`db_setup.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/db_setup.py), destructive database drops via `schema-reset.sql` are strictly guarded behind the `--reset` flag and require interactive typed confirmation (`RESET`) unless `-y` / `--yes` is explicitly provided. Regular execution is strictly non-destructive.

### Zero `public` Schema Pollution (`migrate.py` & `deploy_edge_functions.py`):
- **Migration Tracking via `supabase_migrations` (`migrate.py`)**: Uses `npx -y supabase db push --include-all` and `migration list`. Migration state is stored in Supabase's native `supabase_migrations.schema_migrations` schema rather than `public`, keeping `frontend/src/types/db.ts` and `backend/src/types/db.py` free of helper table pollution.
- **Edge Function Deployment via Supabase CLI (`deploy_edge_functions.py`)**: Uses `npx -y supabase functions list` and `npx -y supabase functions deploy` alongside a gitignored local manifest (`scripts/.edge_functions_state.json`). Each function's SHA-256 digest combines `supabase/functions/_shared/` and `supabase/functions/<name>/` (excluding `.md` docs). Modifying `_shared/` automatically triggers redeployment of all dependent functions, and webhook functions (`resend-webhook`, `trigger-submission-evaluation`, `trigger-material-analysis`) automatically receive `--no-verify-jwt`.

### Redundant LangGraph Initialization Bypass:
LangGraph checkpoint and store table initialization (`PostgresSaver.setup()` and `PostgresStore.setup()`) takes noticeable execution time and issues DDL transactions. `db_setup.py` detects if `langgraph.checkpoints` already exists in PostgreSQL, bypassing setup unless `--with-langgraph` or `--reset` is requested.

### Auto-Virtualenv Fallback:
In [`db_setup.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/db_setup.py), if `psycopg` is not found in the calling Python environment, the script detects the backend virtualenv (`backend/.venv/bin/python`) and transparently re-executes itself using `os.execv`, preventing missing dependency errors during manual runs.

### Schema Separation & Checkpointer Scoping:
- Main application tables reside in the `public` PostgreSQL schema.
- LangGraph checkpoints are isolated in the `langgraph` schema via `DB_OPTIONS="-c search_path=langgraph"`, ensuring agent persistence artifacts do not clutter domain entity tables.

### Contract Generation & Tooltip Auditing:
[`_generate_types.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/_generate_types.py) uses the Supabase CLI (`npx -y supabase gen types`) to derive strict types directly from PostgreSQL catalog reflections, guaranteeing that frontend TypeScript types and backend Python models remain in lockstep with the database DDL. Following type generation, [`_verify_enum_tooltips.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/_verify_enum_tooltips.py) automatically audits generated enum constants against pedagogical UI tooltip definitions in `frontend/src/utils/enumTooltips.ts`.
