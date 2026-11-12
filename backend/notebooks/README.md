# Didactiq Knowledge Base Demos & In-Memory Notebooks

Interactive `.ipynb` notebooks and a runnable `# %%` / CLI demo illustrating the Didactiq Knowledge Base, LangChain/LangGraph workflows, and FastAPI endpoints in action—defaulting to pure in-memory Python objects with zero database setup required.

## Contents

- [`00_knowledge_base_in_action.ipynb`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/notebooks/00_knowledge_base_in_action.ipynb) — Guided 7-act **AP Chemistry 101** classroom story showing the Knowledge Base learn, grade, self-heal, and advise (`DEMO_MODE = "in_memory" | "in_memory_real_llm" | "live"`).
- [`01_langchain_and_langgraph_in_memory.ipynb`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/notebooks/01_langchain_and_langgraph_in_memory.ipynb) — Context formatters, `ChatPromptTemplate | LLM`, JSON parser, and LangGraph `StateGraph` with `MemorySaver` + `InMemoryStore`.
- [`02_knowledge_workflows_in_memory.ipynb`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/notebooks/02_knowledge_workflows_in_memory.ipynb) — In-memory object flows across `TreeIndexerService`, `EvaluatorService`, `OntologyService`, `ConsolidationService`, and `ChatService` with ASCII tree, prerequisite chain, mastery matrix, and visualization renderers.
- [`03_fastapi_endpoints_in_memory.ipynb`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/notebooks/03_fastapi_endpoints_in_memory.ipynb) — In-process ASGI calls to all 8 FastAPI endpoints backed by [`InMemoryWorkspace`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/notebooks/_common.py#L280-L344).
- [`knowledge_base_demo.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/notebooks/knowledge_base_demo.py) — Runnable CLI / `# %%` script executing the same 7-act demo from [`KnowledgeBaseDemo`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/notebooks/_common.py#L567-L850).
- [`_common.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/notebooks/_common.py) — Shared helpers, ASCII renderers, [`InMemoryWorkspace`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/notebooks/_common.py#L280-L344), [`DemoSession`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/notebooks/_common.py#L423-L564), and [`KnowledgeBaseDemo`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/notebooks/_common.py#L567-L850).

## Usage

### Interactive Notebooks (`00`–`03`)
1. Open any `.ipynb` file in VS Code / Jupyter and select the `backend/.venv` Python kernel.
2. Run cells top-to-bottom (`USE_REAL_LLM = False` / `DEMO_MODE = "in_memory"` by default, or enable live OpenRouter / PostgreSQL).

### CLI Demo (`knowledge_base_demo.py`, from `backend/`)
```bash
# Pure in-memory (default, zero DB or API keys required)
uv run python notebooks/knowledge_base_demo.py

# Pure in-memory objects + live OpenRouter LLM
uv run python notebooks/knowledge_base_demo.py --mode in_memory_real_llm

# Live PostgreSQL (ai + langgraph schemas) + live OpenRouter
uv run python notebooks/knowledge_base_demo.py --mode live
```
