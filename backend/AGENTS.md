# Backend Rules — Python 3.13 / FastAPI / uv

Inherits from root `/AGENTS.md`.

## 1. Tooling & Verification
- Manage dependencies via `uv` (`uv add <pkg>`).
- Verify backend: `cd backend && uv run poe lint` (enforces Ruff, BasedPyright, and backend core `code.md`). Do not run frontend checks.
- NEVER edit `src/types/db.py` (read-only). Put API models in `schemas.py` or `ai.py`.

## 2. Layer Boundaries
```
backend/src/
├── server/   # FastAPI routers & HTTP exceptions only (no business logic)
├── service/  # Business logic & LLM workflows (no FastAPI Request objects)
├── types/    # Pydantic v2 models: db.py (read-only), schemas.py, ai.py
└── lib/      # DB pools, LLM client helpers (get_openrouter_llm), logger, config
```
- Handlers use `async def`, FastAPI `Depends(...)`, and `src.lib.logger` (`backend-*.jsonl` with `X-Request-ID`).
