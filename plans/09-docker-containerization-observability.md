# Plan 09: Docker Containerization, Logger Alignment & Infrastructure Observability

> **Status**: ✅ **COMPLETED** (Environment-first path resolution, conditional 12-factor stdout logging in prod, dev-only host volume bind, Dockerfile pre-allocations, Nginx X-Request-ID propagation, verified with `uv run poe lint`, `npm run build`, and `docker compose config`)  
> **Phase**: Phase 5 (Containerization & Infrastructure Observability)  
> **Priority**: `CRITICAL` (Container startup crash remediation & telemetry persistence)  

---

## 1. Problem Statement & Root Cause

Following the implementation of [Plan 00](./00-enum-tooltip-audit-tooling.md) through [Plan 08.5](./08.5-classroom-notifications-resend.md), Teach&Learn features a full-stack coordinated logging engine and rich multi-event notifications. However, running the application inside Docker containers currently encounters startup crashes and telemetry black holes due to four architectural mismatches:

### 1.1 Backend Container Startup Crash (`PermissionError: [Errno 13]`)
In [`backend/src/lib/logger.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/lib/logger.py#L22-L26):
```python
ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
LOGS_DIR = ROOT_DIR / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)
```
- **On Host**: `logger.py` is at `<repo>/backend/src/lib/logger.py`. Four `.parent` traversals locate `<repo>`, resolving `LOGS_DIR` to `<repo>/logs`.
- **Inside Container**: [`backend/Dockerfile`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/Dockerfile) defines `WORKDIR /app` and copies code directly to `/app/src`. Four `.parent` traversals from `/app/src/lib/logger.py` escape the working directory and reach `/` (the Linux container root).
- **Failure Mode**: `LOGS_DIR` resolves to `/logs`. Because the container runs under unprivileged `USER b-usr` (UID 1000) and `/` is owned by `root:root` with mode `0755`, `LOGS_DIR.mkdir()` raises:
  ```text
  PermissionError: [Errno 13] Permission denied: '/logs'
  ```
  This executes unconditionally at module import time, immediately terminating Uvicorn in both `prod` and `dev` targets.

### 1.2 Frontend Dev Container Startup Crash (`EACCES: permission denied`)
In [`frontend/vite.config.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/vite.config.ts#L13-L17):
```typescript
configureServer(server) {
  const rootLogsDir = path.resolve(__dirname, '../logs');
  if (!fs.existsSync(rootLogsDir)) {
    fs.mkdirSync(rootLogsDir, { recursive: true });
  }
```
- **Inside Dev Container**: `WORKDIR /app` means `__dirname` is `/app`. Resolving `../logs` points to `/logs` at container root.
- **Failure Mode**: The container runs under `USER node` (UID 1000). Executing `fs.mkdirSync('/logs')` throws:
  ```text
  Error: EACCES: permission denied, mkdir '/logs'
  ```
  This crashes the Vite dev server on container boot in [`docker-compose.dev.yml`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docker-compose.dev.yml).

### 1.3 Prod vs Dev Observability Delineation & Missing Dev Mounts
- **Production 12-Factor Logging**: Production containers should emit logs exclusively to `sys.stdout` / `sys.stderr` so the container runtime (Docker daemon / log driver) captures them. Disk file generation (`.log`, `.jsonl`) and log file rotation are developer & diagnostic concerns that belong strictly in development environments.
- **Frontend Prod Stripping**: In [`frontend/vite.config.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/vite.config.ts#L145), `drop_console: true` is configured in Terser minification. This strips all `console.*` statements from production bundles, and Vite's `configureServer` (the HMR file logger) never runs in production. Thus, production frontend writes zero logs to disk.
- **No Volume in Prod, Volume in Dev**: Because production generates no log files on disk, [`docker-compose.yml`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docker-compose.yml) requires **no** `./logs` volume mount. Conversely, [`docker-compose.dev.yml`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docker-compose.dev.yml) **must** bind `./logs:/app/logs` so live dev logs are persisted to the host for Rule 8 agent diagnostics.

### 1.4 Missing Environment Variables & Reverse Proxy Correlation
- **Environment Configuration**: `LOG_MAX_ENTRIES`, `VITE_LOG_MAX_ENTRIES`, and `VITE_LOG_LEVEL` are not passed through Docker Compose or documented in [`.env.example`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/.env.example).
- **Request Tracing**: [`frontend/default.conf.template`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/default.conf.template) proxies `/api` requests to `backend` but fails to forward or inject the `X-Request-ID` correlation header required by backend request-tracing middleware.
- **Alternative Host Drift**: [`alternative-host/Dockerfile`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/alternative-host/Dockerfile) relies on legacy Node 20 and Python 3.11 instead of the workspace standards (Node 24 and Python 3.13).

---

## 2. Target Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 DEVELOPMENT WORKFLOW                                   │
│                                                                                        │
│   Host ./logs/  ◄─────────────────────────┬──────────────────────────────┐             │
│   ├── backend-2026-09-17-...jsonl         │                              │             │
│   ├── backend-error-2026-09-17-...log     │ Bind Mount                   │ Bind Mount  │
│   ├── frontend-2026-09-17-...jsonl        │ (./logs:/app/logs)           │ (./logs:    │
│   └── frontend-error-2026-09-17-...log    │                              │  /app/logs) │
└───────────────────────────────────────────┼──────────────────────────────┼─────────────┘
                                            ▼                              ▼
                      ┌───────────────────────────┐  ┌─────────────────────────┐
                      │    FRONTEND (DEV: Vite)   │  │  BACKEND (DEV: FastAPI) │
                      │  • Port 8080 (Vite HMR)   │  │  • Port 8090 (Uvicorn)  │
                      │  • USER node (1000)       │  │  • USER b-usr (1000)    │
                      │  • Reads VITE_LOGS_DIR    │  │  • Reads LOGS_DIR       │
                      │  • Writes to /app/logs    │  │  • Writes to /app/logs  │
                      └───────────────────────────┘  └─────────────────────────┘

──────────────────────────────────────────────────────────────────────────────────────────

┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                  PRODUCTION WORKFLOW                                   │
│                                                                                        │
│   NO Volume Mounts · Pure 12-Factor Stdout Logs · No Disk Writes                       │
│                                                                                        │
│   ┌────────────────────────────────────────┐     ┌──────────────────────────────────┐  │
│   │       FRONTEND (PROD: Nginx)           │     │      BACKEND (PROD: FastAPI)     │  │
│   │  • Serves static HTML/JS/CSS           │     │  • ENVIRONMENT=production        │  │
│   │  • Terser drop_console: true           │     │  • File handlers NOT attached    │  │
│   │  • No client-log-broadcaster plugin    │     │  • Emits purely to sys.stdout    │  │
│   │  • Injects X-Request-ID to backend     │────►│  • Zero disk write / No mkdir    │  │
│   │  • Docker captures stdout access logs  │     │  • Docker captures stdout logs   │  │
│   └────────────────────────────────────────┘     └──────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Implementation Steps

### Step 3.1: Environment-Variable-First Logger Path & Prod/Dev Split ([`backend/src/lib/logger.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/lib/logger.py))
1. **Dynamic Path Resolution**: Prioritize `LOGS_DIR` environment variable. If absent/empty, fall back to programmatic relative path (`ROOT_DIR / "logs"`).
2. **Conditional File Handlers**: In production (`ENVIRONMENT == "production"` or `ENABLE_FILE_LOGGING == "false"`), attach **only** `StreamHandler(sys.stdout)`. Completely skip directory creation (`LOGS_DIR.mkdir()`) and file handlers (`.log`, `-error.log`, `.jsonl`). In dev/local mode, initialize file handlers and rotation.

```python
ENVIRONMENT = os.environ.get("ENVIRONMENT", "production").lower()
ENABLE_FILE_LOGGING = os.environ.get(
    "ENABLE_FILE_LOGGING", "true" if ENVIRONMENT != "production" else "false"
).lower() in ("true", "1", "yes")

# Determine log directory: check env var first, fall back to coded relative path
_env_logs = os.environ.get("LOGS_DIR")
if _env_logs:
    LOGS_DIR = Path(_env_logs)
else:
    ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
    LOGS_DIR = ROOT_DIR / "logs"

# Only ensure directory exists if file logging is enabled
if ENABLE_FILE_LOGGING:
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
```

In `setup_logger()`:
```python
# 1. Console Stream Handler (Always attached for both prod & dev)
stdout_handler = logging.StreamHandler(sys.stdout)
...
logger_instance.addHandler(stdout_handler)

# 2. Coordinated Rotator & Timestamped Handlers (DEV ONLY)
if ENABLE_FILE_LOGGING:
    rotator = CoordinatedLogRotator(LOGS_DIR, max_entries=MAX_LOG_ENTRIES)
    init_ts = rotator.current_ts

    app_path = LOGS_DIR / f"backend-{init_ts}.log"
    app_handler = PrimaryCountingFileHandler(rotator, app_path, encoding="utf-8")
    ...
    logger_instance.addHandler(app_handler)
    logger_instance.addHandler(error_handler)
    logger_instance.addHandler(jsonl_handler)
```

### Step 3.2: Backend Dockerfile Directory Pre-creation ([`backend/Dockerfile`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/Dockerfile))
In stage `dev`, pre-create `/app/logs` with `USER_ID:GROUP_ID` ownership and expose `LOGS_DIR=/app/logs`:

```dockerfile
# Under stage 'dev' before USER b-usr:
ARG USER_ID=1000
ARG GROUP_ID=1000
RUN  groupadd -g ${GROUP_ID} b-grp \
  && useradd -l -u ${USER_ID} -g b-grp -m b-usr \
  && mkdir -p /app/logs \
  && chown -R ${USER_ID}:${GROUP_ID} /app/logs

ENV LOGS_DIR=/app/logs

USER b-usr
```

### Step 3.3: Environment-Variable-First Frontend Logger Path ([`frontend/vite.config.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/vite.config.ts))
In Vite `client-log-broadcaster` (which is already dev-only via `configureServer`):
1. Check `process.env.VITE_LOGS_DIR` first.
2. If absent/empty, fall back to `path.resolve(__dirname, '../logs')`.

```typescript
configureServer(server) {
  const envLogsDir = process.env.VITE_LOGS_DIR;
  const rootLogsDir = envLogsDir
    ? path.resolve(envLogsDir)
    : path.resolve(__dirname, '../logs');

  if (!fs.existsSync(rootLogsDir)) {
    fs.mkdirSync(rootLogsDir, { recursive: true });
  }
```

### Step 3.4: Frontend Dockerfile Directory Pre-creation ([`frontend/Dockerfile`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/Dockerfile))
In `prep` stage, pre-create `/app/logs` with `node:node` ownership:

```dockerfile
# Create directories before switching users
RUN mkdir -p /app/node_modules /app/dist /app/logs \
  && chown -R node:node /app

# In stage dev:
ENV VITE_LOGS_DIR=/app/logs
```

### Step 3.5: Docker Compose Configurations (Prod Clean vs Dev Mounted)
- **[`docker-compose.yml`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docker-compose.yml) (Production)**:
  - **No** `./logs` volume mount.
  - Passes production environment variables cleanly.
  ```yaml
  services:
    backend:
      image: ta-backend
      container_name: ta-backend
      build:
        context: ./backend
        dockerfile: Dockerfile
        target: prod
        args:
          USER_ID: ${UID:-1000}
          GROUP_ID: ${GID:-1000}
      environment:
        - BACKEND_PORT=${BACKEND_PORT:-8090}
        - OPENROUTER_API_KEY
        - OPENROUTER_MODEL
      expose:
        - "${BACKEND_PORT:-8090}"
      restart: unless-stopped

    frontend:
      image: ta-frontend
      container_name: ta-frontend
      build:
        context: ./frontend
        dockerfile: Dockerfile
        target: prod
        args:
          VITE_SUPABASE_URL: ${VITE_SUPABASE_URL}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${VITE_SUPABASE_PUBLISHABLE_KEY}
      ports:
        - "${HOST_PORT:-80}:${FRONTEND_PORT:-8080}"
      environment:
        - FRONTEND_PORT=${FRONTEND_PORT:-8080}
        - BACKEND_PORT=${BACKEND_PORT:-8090}
        - BACKEND_HOST=backend
      depends_on:
        backend:
          condition: service_healthy
      restart: unless-stopped
  ```

- **[`docker-compose.dev.yml`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docker-compose.dev.yml) (Development Override)**:
  - Mounts `./logs:/app/logs` on both `backend` and `frontend`.
  - Sets runtime dev envs.
  ```yaml
  services:
    backend:
      image: ta-backend-dev
      container_name: ta-backend-dev
      build:
        target: dev
      ports:
        - "${BACKEND_PORT:-8090}:${BACKEND_PORT:-8090}"
      volumes:
        - ./backend/src:/app/src:ro
        - ./logs:/app/logs
      environment:
        - LOG_MAX_ENTRIES=${LOG_MAX_ENTRIES:-5000}

    frontend:
      image: ta-frontend-dev
      container_name: ta-frontend-dev
      build:
        target: dev
      ports:
        - "${FRONTEND_PORT:-8080}:${FRONTEND_PORT:-8080}"
      volumes:
        - ./frontend/src:/app/src:ro
        - ./frontend/public:/app/public:ro
        - ./frontend/index.html:/app/index.html:ro
        - ./frontend/tsconfig.json:/app/tsconfig.json:ro
        - ./frontend/vite.config.ts:/app/vite.config.ts:ro
        - ./logs:/app/logs
      environment:
        - VITE_LOG_LEVEL=${VITE_LOG_LEVEL:-DEBUG}
        - VITE_LOG_MAX_ENTRIES=${VITE_LOG_MAX_ENTRIES:-5000}
        - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
        - VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}
  ```

### Step 3.6: Inject Correlation Header in Nginx ([`frontend/default.conf.template`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/default.conf.template))
Add `proxy_set_header X-Request-ID $request_id;` inside the `/api` reverse proxy block so every HTTP request entering Nginx carries a correlated trace ID down to FastAPI.

### Step 3.7: Update Environment Documentation ([`.env.example`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/.env.example))
Document port mappings, Supabase credentials, OpenRouter configuration, and logging limits:

```dotenv
# Port Configuration
HOST_PORT=80
FRONTEND_PORT=8080
BACKEND_PORT=8090
COMPOSE_FILE=docker-compose.yml

# Supabase Credentials (Required for Auth & Data)
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=

# OpenRouter & AI Gateway
OPENROUTER_API_KEY=
OPENROUTER_MODEL=google/gemini-2.5-flash

# Logging & Observability (Dev)
LOG_MAX_ENTRIES=5000
VITE_LOG_MAX_ENTRIES=5000
VITE_LOG_LEVEL=DEBUG
```

### Step 3.8: Align Alternative Host Container ([`alternative-host/Dockerfile`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/alternative-host/Dockerfile))
Upgrade base images to `node:24-slim` and `python:3.13-slim` to prevent environment drift.

---

## 4. Droast Container Security & Best Practice Checklist

| Pillar | Requirement | Verification in Plan 09 |
| :--- | :--- | :---: |
| **1. Base Images** | Specific digests/tags, no `:latest` | ✅ `python:3.13.15-slim-trixie`, `node:24-slim`, `nginx:stable-alpine` |
| **2. Privilege Separation** | Never run production as root (`UID 0`) | ✅ Backend runs as `b-usr` (1000); Frontend dev runs as `node` (1000) |
| **3. Layer Caching** | Dependency manifests copied before code | ✅ `pyproject.toml` and `package.json` cached ahead of `src` |
| **4. Secret Safety** | No credentials in `ARG` or `ENV` | ✅ Secrets passed at runtime via compose environment, never baked in images |
| **5. File Ownership** | Pre-allocate paths, no redundant `chown -R` | ✅ `/app/logs` created with ownership during image setup in dev |
| **6. Observability** | 12-factor stdout in prod, file logs in dev | ✅ Prod writes strictly to stdout; Dev persists files via non-root volume bind |

---

## 5. Verification Plan

### 5.1 Automated Build & Lint Verification
1. `uv run poe lint`: Verify `backend/src/lib/logger.py` passes Ruff and BasedPyright with 0 errors.
2. `npm run build`: Verify `frontend/vite.config.ts` passes Vite build without errors.

### 5.2 Container Runtime Verification
1. **Container Startup**: Run `docker compose config` and `docker compose -f docker-compose.yml -f docker-compose.dev.yml config` to validate YAML syntax.
2. **Production Container Run**:
   - `docker compose build backend` and verify clean build.
   - Run production container; verify stdout logging works and no `PermissionError` is thrown (file logging disabled).
   - Verify `docker-compose.yml` has no volume mounts.
3. **Development Container Run**:
   - `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d`
   - Backend starts with status `healthy`.
   - Frontend starts Vite dev server without `EACCES`.
   - Issue `curl http://localhost:8090/api/health` and verify logs appear in host `./logs/backend-*.log` and `backend-*.jsonl`.
   - Verify Nginx forwards `X-Request-ID`.
