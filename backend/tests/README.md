# Didactiq Backend AI & Knowledge Store Tests

Interactive `# %%` Python test suites covering LangChain/LangGraph primitives, Dual-Engine Knowledge Store workflows, and all 8 FastAPI endpoints.

## Files

- [`_harness.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/tests/_harness.py): Shared stateful in-memory PostgreSQL emulator (`MockDBState`), deterministic LangChain `FakeOpenRouterLLM`, `LiveDBSandbox` (ephemeral live-DB provisioning + cleanup), ASGI/HTTP client factory, and `# %%` cell runner.
- [`test_langchain_and_langgraph.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/tests/test_langchain_and_langgraph.py): Prompt formatters, OpenRouter `ChatOpenAI` config, resilient JSON parser, `ChatPromptTemplate` LCEL chains, and `StateGraph` checkpointing (`MemorySaver` offline + `AsyncPostgresSaver`/`AsyncPostgresStore` live).
- [`test_knowledge_workflows.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/tests/test_knowledge_workflows.py): `TreeIndexerService`, `OntologyService` (OKF v0.2, recursive CTEs, `ai.check_answerable`), `EvaluatorService`, `ConsolidationService` (orphan/cycle audit + Misconception Dreaming), and `ChatService` dual-engine RAG.
- [`test_fastapi_endpoints.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/tests/test_fastapi_endpoints.py): End-to-end checks for `/api/health`, `/api/chat`, `/api/grade`, `/api/materials/analyze`, `/api/materials/tree`, `/api/consolidation/run`, `/api/misconceptions/proposed`, and `/api/misconceptions/{id}/review`.

## Execution Modes

| Mode | Command (from `backend/`) | Requirements |
| :--- | :--- | :--- |
| **Offline / Mocked (default)** | `uv run poe test` | None (uses `MockDBState` + `FakeOpenRouterLLM` + in-process ASGI) |
| **Live E2E (in-process ASGI)** | `uv run poe test-live` (or `uv run pytest --live`) | `POSTGRES_URI` (running DB with `ai`/`langgraph` schemas) + `OPENROUTER_API_KEY` |
| **Live Running Server** | `TEST_BASE_URL=http://localhost:8090 uv run pytest tests/test_fastapi_endpoints.py --live` | Running FastAPI server (`make dev-backend` / Docker) |
| **Interactive `# %%` Cells** | Open any `test_*.py` file and click **Run Cell** in VS Code / Jupyter Interactive Window | Optional `ipykernel` if running inside Jupyter Interactive Window |
| **Direct Script Runner** | `uv run python tests/test_knowledge_workflows.py` | Same as Offline or `DIDACTIQ_TEST_MODE=live` |
