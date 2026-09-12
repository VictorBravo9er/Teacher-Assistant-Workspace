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

## 3. Alternative Unified Hosting Strategy (`alternative-host/`)

For lightweight or single-instance cloud environments, the `alternative-host/` directory provides a self-contained unified hosting model that bundles the compiled React frontend directly inside the FastAPI backend container:

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart LR
    Browser["Client Browser (Port 8090)"]
    
    subgraph UnifiedContainer["Single Unified Container (FastAPI / Uvicorn)"]
        FastAPIRouter["FastAPI Application"]
        APIRoutes["/api/* Endpoints"]
        StaticMount["/assets Static Mount"]
        SPAFallback["/{full_path:path} SPA Catch-All -> index.html"]
        
        FastAPIRouter --> APIRoutes
        FastAPIRouter --> StaticMount
        FastAPIRouter --> SPAFallback
    end

    Browser -->|API Requests| APIRoutes
    Browser -->|Asset Requests| StaticMount
    Browser -->|Page Navigation| SPAFallback
```

- **`deploy.sh`**: Runs `npm run build` in `frontend/` and syncs the distribution bundle to `alternative-host/workdir/dist`.
- **`main.py`**: Mounts `/assets` via `StaticFiles` and serves `index.html` on any non-API route to maintain client-side SPA routing.

---

## 4. Automation & Provisioning Scripts (`scripts/`)

The `scripts/` directory contains CLI automation tools for database lifecycle, LangGraph initialization, type generation, and environment configuration:

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    EnvHelper["_env_helper.py (Resolves POSTGRES_URI)"]
    
    SetupDB["db_setup.py (Master Provisioner)"]
    LangGraphInit["_setup_langchain_postgres.py"]
    GenTypes["_generate_types.py"]
    EnvCollector["collect_env_files.sh"]

    EnvHelper --> SetupDB
    EnvHelper --> LangGraphInit

    SetupDB -->|Executes DDL| PostgreSQL[("PostgreSQL Database")]
    SetupDB --> LangGraphInit
    SetupDB --> GenTypes

    GenTypes -->|Supabase CLI| TypeScriptTypes["frontend/src/types/db.ts"]
    GenTypes -->|SQLAlchemy Model Codegen| PythonTypes["backend/src/types/db.py"]

    EnvCollector -->|Merges .env.local + sub-envs| RootEnv[".env"]
```

### Automation Tools:
1. **`db_setup.py`**:
   - Connects via `psycopg`, executes `schema-reset.sql`, `schema-db.sql`, and `schema-ai.sql` in strict dependency sequence.
   - Automatically invokes LangGraph checkpointer initialization and type generation.
2. **`_setup_langchain_postgres.py`**:
   - Configures PostgreSQL tables and checkpointer schemas for LangGraph using `PostgresSaver` and `PostgresStore`.
3. **`_generate_types.py`**:
   - Uses the Supabase CLI (`supabase gen types typescript`) to generate `frontend/src/types/db.ts` and maps relational schemas into `backend/src/types/db.py`.
4. **`collect_env_files.sh`**:
   - Aggregates environment variables from `.env.local`, `frontend/.env`, and `backend/.env` into a single consolidated root `.env` file for Docker Compose.

---

## 5. Serverless Static Hosting (Vercel)

For external serverless deployments, `vercel.json` defines edge routing rules to support client-side Single-Page Application (SPA) routing:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

This ensures that deep links (e.g. `/classes/:classId`) return the main `index.html` shell to let React Router resolve the view in the browser.
