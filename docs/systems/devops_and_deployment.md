# DevOps, Deployment & Containerization Subsystem

The **DevOps, Deployment & Containerization Subsystem** governs multi-container orchestration, rootless container security, build pipelines, database provisioning automation, static edge hosting, and environment variable synchronization across the Teach&Learn platform.

---

## 1. Multi-Container Orchestration Architecture

The workspace utilizes **Docker Compose** to coordinate decoupled frontend and backend services in development and production environments:

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    subgraph DockerHost["Docker Host Network"]
        subgraph FrontendService["Frontend Container (Port 80)"]
            Nginx["Nginx Unprivileged (USER 1000:1000)"]
            HTML["Vite React Bundle (/usr/share/nginx/html)"]
            Nginx --> HTML
        end

        subgraph BackendService["Backend Container (Port 8090)"]
            Uvicorn["Uvicorn / FastAPI (USER 1000:1000)"]
            PyApp["Python 3.13 / LangChain Service (/app)"]
            Uvicorn --> PyApp
        end
    end

    Client["Browser Client"] -->|HTTP / SPA Navigation (Port 80)| Nginx
    Client -->|REST API / CORS (Port 8090)| Uvicorn
    Nginx -.->|Reverse Proxy / Direct| Uvicorn
```

### 1.1 Compose Configurations:
1. **`docker-compose.yml` (Base Production Deployment)**:
   - Configures non-root user execution (`user: "1000:1000"`).
   - Injects healthcheck directives for both containers.
   - Restricts port bindings to `80:80` (Frontend) and `8090:8090` (Backend).
   - Enforces production environment variables via `.env`.
2. **`docker-compose.dev.yml` (Local Development Layer)**:
   - Overlays bind mounts from host directories (`./frontend:/app`, `./backend:/app`) to enable live hot-reloading for Vite and Uvicorn (`--reload`).
   - Mounts anonymous volumes for container-internal `node_modules` and Python `.venv` to prevent host OS binary conflicts.

---

## 2. Container Security & Immutability Standards

The Teach&Learn workspace implements strict container hardening standards:

1. **Rootless Container Execution**:
   - Both the frontend Nginx image (`nginxinc/nginx-unprivileged:alpine`) and the backend Python image execute as unprivileged UID/GID `1000:1000`.
   - Prevents container escape privilege escalation vulnerabilities.
2. **Immutable Production File Permissions**:
   - Production Dockerfile layers enforce read-only permissions across source assets:
     - Directories mapped to `0555` (read + execute).
     - Source files mapped to `0444` (read-only).
   - Prevents runtime tampering or unauthorized file modification inside containers.
3. **Multi-Stage Builds**:
   - Frontend: Node.js build stage compiles static assets, discarding build tooling in the final minimal Nginx runtime image.
   - Backend: uv build stage installs Python dependencies, discarding compilation toolchains in the final runtime container.

---

## 3. Automation & Provisioning Scripts (`scripts/`)

The `scripts/` directory contains CLI automation tools for database lifecycle, LangGraph initialization, type generation, and environment configuration:

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    EnvHelper["_env_helper.py (Resolves POSTGRES_URI)"]
    
    SetupDB["db_setup.py (Master Provisioner - Two-Tier Concurrency)"]
    Migrate["migrate.py (Migration Runner)"]
    LangGraphInit["_setup_langchain_postgres.py"]
    GenTypes["_generate_types.py (Concurrent TS & Python Gen)"]
    DocLinter["verify_doc_coverage.py (Doc Linter)"]
    EdgeDeploy["deploy_edge_functions.py (Guarded Incremental Edge Deployer)"]
    DBDump["db_dump.py (Parallel DDL & Fixture Dumper)"]
    EnvCollector["collect_env_files.sh"]

    EnvHelper --> SetupDB
    EnvHelper --> Migrate
    EnvHelper --> LangGraphInit
    EnvHelper --> EdgeDeploy
    EnvHelper --> DBDump
    SetupDB --> DocLinter

    SetupDB -->|Executes DDL| PostgreSQL[("PostgreSQL Database")]
    Migrate -->|Applies Timestamped SQL Migrations| PostgreSQL
    SetupDB --> LangGraphInit
    SetupDB --> Migrate
    SetupDB -->|Concurrent Phase 3 Workers| GenTypes
    SetupDB -->|Concurrent Phase 3 Workers| EdgeDeploy
    SetupDB -->|Concurrent Phase 3 Workers| DBDump

    GenTypes -->|Supabase CLI| TypeScriptTypes["frontend/src/types/db.ts"]
    GenTypes -->|Supabase CLI Python Gen| PythonTypes["backend/src/types/db.py"]
    EdgeDeploy -->|SHA-256 Diff + Guardrails| Manifest["supabase/functions/deployed.json"]
    EdgeDeploy -->|Bounded Concurrency (max_workers=4)| SupabaseEdge["Supabase Edge Functions Runtime"]

    EnvCollector -->|Merges .env.local + sub-envs| RootEnv[".env"]
```

### Automation Tools:
1. **`db_setup.py`**:
   - Master orchestrator for database provisioning implementing a **Two-Tier Concurrent Pipeline**:
     - **Phase 1 (Serial Gate 1)**: Database baseline — teardown (`schema-reset.sql` under `--reset`) and LangGraph checkpoint table verification via `_setup_langchain_postgres.py`.
     - **Phase 2 (Serial Gate 2)**: Database migrations — applies incremental SQL migrations via `migrate.py` (`supabase db push`).
     - **Phase 3 (Top-Level Concurrent Pipeline)**: Concurrently runs 6 workers via a `ThreadPoolExecutor`:
       - Worker 1: Edge Functions deployment audit & sync (`deploy_edge_functions.py`).
       - Worker 2: TypeScript contract generation & enum tooltip verification (`_generate_types.py`).
       - Worker 3: Python contract generation (`_generate_types.py`).
       - Workers 4–6: Concurrent DDL schema dumps for `public`, `ai`, and `langgraph` (`db_dump.py`).
     - Renders a clean, thread-safe timed summary box. Available via `make db-setup` and `make db-reset`.
2. **`deploy_edge_functions.py`**:
   - Guarded incremental Supabase Edge Functions deployer:
     - Tracks deployment state in version-controlled [`supabase/functions/deployed.json`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/deployed.json) with composite SHA-256 digests (`hash`), remote sequential versions (`version`), and ISO 8601 UTC timestamps (`updated_at`).
     - Detects out-of-band remote drift via Supabase CLI (`functions list -o json`) and prevents accidental overwrites without explicit user confirmation.
     - Implements Tier-2 bounded internal concurrency (`--concurrency 4`, default) deploying multiple modified functions concurrently via `ThreadPoolExecutor`.
     - Provides an enhanced `--status` inspection table. Available via `make deploy-functions` and `make deploy-functions-status`.
3. **`_generate_types.py`**:
   - Generates database contract types via Supabase CLI:
     - Exposes decoupled functions `generate_typescript_types` and `generate_python_types` targeting `frontend/src/types/db.ts` and `backend/src/types/db.py`.
     - `main()` coordinates both generators concurrently using a `ThreadPoolExecutor` and triggers pedagogical enum tooltip validation upon completion. Available via `make types`.
4. **`db_dump.py`**:
   - Local DDL schema and fixture generation tool:
     - Dumps per-schema DDL (`schema.<name>.sql` for `public`, `ai`, and `langgraph` in `supabase/schemas/`) concurrently via `dump_schemas(parallel=True)`.
     - Dumps table fixtures directly into `supabase/seed.sql` via `dump_data()`. Available via `make db-dump-schema`, `make db-dump-data`, and `make db-dump`.
5. **`_setup_langchain_postgres.py`**:
   - Configures PostgreSQL checkpoint and store tables in schema `langgraph` using `PostgresSaver` and `PostgresStore`.
6. **`migrate.py`**:
   - Database migration runner executing versioned SQL migration scripts from `supabase/migrations/` in sequence via Supabase CLI (`db push`) with real-time terminal streaming and interactive confirmation, supporting `--status` inspection and `-y` / `--yes` flags. Available via `make migrate` and `make migrate-status`.
7. **`collect_env_files.sh`**:
   - Aggregates environment variables from `.env.local`, `frontend/.env`, and `backend/.env` into a single consolidated root `.env` file for Docker Compose.
8. **`verify_doc_coverage.py`**:
   - Documentation coverage linter attached to `uv run poe lint` and `pnpm run lint`. Audits core architectural `src/` directories ensuring presence of `code.md` and complete source file cataloging.

---

## 4. Serverless Multi-Service Hosting (Vercel)

For external serverless deployments, the repository-level `vercel.json` orchestrates both the Vite frontend and Python FastAPI backend as distinct services. The top-level rules select the backend for `/api/*` and the frontend for all other public paths; the frontend service then owns its SPA fallback so every client-side route returns the built `index.html` shell. The `frontend/vercel.json` file remains the standalone-project equivalent when `frontend/` is configured as the Vercel project root.

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "services": {
    "frontend": {
      "root": "frontend/",
      "framework": "vite",
      "outputDirectory": "dist",
      "cleanUrls": false,
      "rewrites": [
        {
          "source": "/(.*)",
          "destination": "/index.html"
        }
      ]
    },
    "backend": {
      "root": "backend/",
      "entrypoint": "src.main:app"
    }
  },
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": {
        "service": "backend"
      }
    },
    {
      "source": "/(.*)",
      "destination": {
        "service": "frontend"
      }
    }
  ]
}
```

This configuration ensures:
1. **REST API Routing**: All `/api/*` HTTP requests are directed to the FastAPI service (`backend/src.main:app`).
2. **SPA Client Routing**: All web and deep client-side routes (`/(.*)`) are first routed to the frontend service, whose service-level rewrite serves `dist/index.html` for requests that do not resolve to a built asset. `cleanUrls` remains disabled so the explicit `.html` fallback is not transformed unexpectedly.
3. **Standalone Frontend Compatibility**: When `frontend/` itself is the Vercel project root, `frontend/vercel.json` applies the same SPA fallback at the project level.

### 4.1 Ignored Build Step Filtering (`bash-decide.sh`)

To prevent unnecessary serverless builds and save Vercel build minutes, [`bash-decide.sh`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/bash-decide.sh) is configured as the Vercel **Ignored Build Step** command:

1. **Branch Filter**: Builds only run on `preview`, `main`, and `master` branches. Other branches exit with code `0` (skipping deployment).
2. **First-Time Deployment**: If `$VERCEL_GIT_PREVIOUS_SHA` is unset, it proceeds with build (exit code `1`).
3. **Targeted Diff Detection**: Compares `$VERCEL_GIT_PREVIOUS_SHA` against `HEAD` scoping `frontend/`, `backend/`, and `vercel.json`:
   - If diff is empty (e.g., changes only touch docs, root configs, or scratch files): exits `0` (deployment skipped).
   - If changes are detected in deployable code or configuration: exits `1` (deployment proceeds).
