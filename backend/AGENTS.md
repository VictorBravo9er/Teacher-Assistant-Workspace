# Backend Rules — Python 3.13 / FastAPI / uv

Inherits from root `/AGENTS.md`.

## 1. Invariants & Pre-Completion Check
- **Tooling**: Manage dependencies exclusively via `uv` (`uv add <pkg>`). Commands: `uv run poe lint` | `uv run poe format` | `uv run poe run-dev` | `uv run poe test`.
- **Generated Types**: NEVER edit `src/types/db.py`. Put API/AI models in `schemas.py` or `ai.py`.
- **Docs-First Inspection**: Before reading `.py` files, read `systems/backend_service.md` (and `systems/ai_and_ontology_subsystem.md` for AI routes) plus `<dir>/code.DESC.md` & `<dir>/code.ARCH.md`.
- **Pre-Completion Check**:
  1. `cd backend && uv run poe lint` (Ruff & BasedPyright clean).
  2. Sync `systems/backend_service.md`, affected `systems/workflows[-atomic]/*.md`, and modified folders' `code.ARCH.md` / `code.DESC.md`.

## 2. Layer Boundaries
```
backend/src/
├── server/   # FastAPI routers & HTTP exception mapping only (no business logic)
├── service/  # Framework-agnostic business logic & LangGraph/LLM workflows (no FastAPI Request objects)
├── types/    # Pydantic v2 models: db.py (read-only), schemas.py, ai.py
└── lib/      # DB pools, OpenRouter LLM client helpers (get_openrouter_llm), logger, config
```
- Use `async def` handlers, FastAPI `Depends(...)`, and `src.lib.logger` (`backend-*.jsonl` with `X-Request-ID`).
