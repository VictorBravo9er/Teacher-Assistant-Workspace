# Backend Rules — Python 3.13 / FastAPI / uv

Cascades from root `/AGENTS.md`.

## 1. Stack & Invariants
- **Stack**: Python `>=3.13,<3.14`, FastAPI, Pydantic v2, `uv`, LangChain.
- **Package Manager**: `uv` only. Never use global `pip install`. Add deps: `uv add <pkg>` / `uv add --dev <pkg>`.
- **Task Runner**: `uv run poe lint` | `uv run poe format` | `uv run poe run-dev` | `uv run poe test`.
- **Generated Types Invariant**: NEVER edit `src/types/db.py`. Define API models in `schemas.py` or `ai.py`.
- **Pre-Completion Check**: `cd backend && uv run poe lint` — Ruff & BasedPyright both clean.

## 2. Directory Structure & Layer Boundaries
```
backend/src/
├── server/     # FastAPI route handlers, routers, HTTP exception mappers
├── service/    # Business logic & agent workflows (framework-agnostic)
├── types/      # Pydantic v2 models: db.py (read-only), schemas.py, ai.py
└── lib/        # DB pools, LLM client helpers, logger, configuration
```
**Layer contracts**:
- `server/` parses HTTP, calls services, returns responses. Never business logic here.
- `service/` contains domain rules. Never access raw FastAPI `Request` objects.
- Domain failures → structured HTTP errors with appropriate codes (`400/401/403/404/422/500`).

## 3. FastAPI & Async Conventions
- All route handlers use `async def`.
- Use `Depends(...)` for services, auth contexts, and DB sessions.
- Validate all request bodies and query params with strict Pydantic v2 `BaseModel`.

## 4. LLM & Service Standards
- **LLM Access**: OpenRouter via `ChatOpenRouter` / `ChatOpenAI` (`get_openrouter_llm`).
- **Prompt Templating**: `ChatPromptTemplate` with typed context formatters.
- **Resilience**: Catch API timeouts, JSON parse errors, and upstream failures; return structured fallback responses.

## 5. Logging & Telemetry
- Logger import: `src.lib.logger`. Diagnostics follow root `AGENTS.md` (read `backend-*.jsonl`; trace with `X-Request-ID`).
