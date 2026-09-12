# Backend Rules & Guidelines — Python 3.13 / FastAPI / LangGraph

This document defines the rules, conventions, and operational practices for the **Teach&Learn** backend API service in `backend/`. These rules cascade from and specialize the universal workspace principles defined in the root [`/AGENTS.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/AGENTS.md).

---

## 1. Toolchain & Package Management

- **Runtime**: Python `>=3.13,<3.14`.
- **Package & Dependency Manager**: `uv`.
  - **Never** use global `pip install`.
  - Add production packages: `uv add <package>`.
  - Add development dependencies: `uv add --dev <package>`.
- **Task Runner (`poe`)**:
  - Run linting and formatting: `uv run poe lint`, `uv run poe format`.
  - Run dev server: `uv run poe run-dev`.
  - Run tests: `uv run poe test`.

---

## 2. Directory Architecture & Layer Boundaries

Backend code is structured under `backend/src/`:

```
backend/src/
├── server/       # FastAPI route handlers, API routers, and HTTP exception mappers
├── service/      # Core business logic, orchestration, and service services
├── types/        # Pydantic v2 data models, request/response schemas, TypedDicts
└── lib/          # Database connection pools, LLM client helpers, configuration
```

### Layer Boundaries:
1. **HTTP Layer (`server/`)**: Responsible *only* for parsing HTTP requests, dependency injection, calling domain services, and returning structured responses.
2. **Business Logic Layer (`service/`)**: Framework-agnostic business rules and agent workflows. Never access raw FastAPI `Request` objects directly inside services.
3. **Schemas (`types/`)**: Single authoritative Pydantic v2 models for data validation, serialization, and typing contracts.
4. **Exceptions**: Handle domain failures gracefully and convert them into structured HTTP errors with appropriate status codes (`400`, `401`, `403`, `404`, `422`, `500`).

---

## 3. FastAPI & Async Conventions

- Define all endpoint route handlers using `async def`.
- Use FastAPI dependency injection (`Depends(...)`) for services, authentication contexts, and database sessions.
- Always validate request bodies and query params using strict Pydantic v2 schemas (`BaseModel` with explicit field types).

---

## 4. LangChain & LangGraph Standards

- **LLM Access**: Integrate models via OpenRouter client configurations (`ChatOpenRouter`).
- **Graph State**: Define strongly typed state graphs using Python `TypedDict` or Pydantic models.
- **Persistence**: Persist conversation checkpoints to PostgreSQL using `langgraph-checkpoint-postgres`.
- **Error Handling**: Use structured retry policies and fallback nodes within state graphs rather than unhandled bubbling exceptions.

---

## 5. Type Safety, Linting & Verification

Maintain strict zero-warning compliance across all linters and typecheckers:
- **BasedPyright**: Strict type verification (`basedpyright .`).
- **Ruff**: Formatting, import sorting, and code quality checks (`ruff check .`, `ruff format .`).

Before completing any backend task, verify that all checks pass cleanly:

```bash
cd backend && uv run poe lint
```
