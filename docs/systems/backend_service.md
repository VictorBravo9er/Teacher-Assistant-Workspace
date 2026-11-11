# Backend Service Architecture (FastAPI & LangChain)

The **Backend Service Subsystem** is an asynchronous Python 3.13 application powered by **FastAPI**, **LangChain Core**, **Pydantic v2**, and **Uvicorn**. It handles RESTful API endpoints, prompt serialization, model invocation through OpenRouter, structured LLM JSON extraction, and LangGraph persistent state management.

---

## 1. Directory Layout & Module Architecture

```
backend/
├── Dockerfile                  # Production multi-stage rootless container definition
├── pyproject.toml              # Dependencies managed via uv (Python 3.13, FastAPI, LangChain)
├── entrypoint.sh               # Container startup script verifying environment parameters
└── src/
    ├── main.py                 # FastAPI application factory, lifespan connection pool, CORS, router mounting
    ├── server/
    │   └── router.py           # APIRouter defining health, chat, grade, materials, trees, consolidation, and misconceptions
    ├── service/
    │   ├── chat.py             # ChatService coordinating pre-query answerable gate, dual-engine RAG, and prompt budgeting
    │   ├── consolidation.py    # ConsolidationService executing anti-drift audits and autonomous Misconception Dreaming
    │   ├── evaluator.py        # EvaluatorService performing grading, student mastery updates, error patterns, and syllabus analysis
    │   ├── ontology.py         # OntologyService managing OKF v0.2 graph nodes, recursive CTE traversals, and misconception reviews
    │   └── tree_indexer.py     # TreeIndexerService for PageIndex-inspired hierarchical JSONB outline & summary trees
    ├── lib/
    │   ├── db.py               # Asynchronous PostgreSQL connection pool (psycopg_pool.AsyncConnectionPool) with lifespan management
    │   ├── formatter.py        # String and context serializers for prompts
    │   ├── llm.py              # OpenRouter ChatOpenAI client factory and JSON parser
    │   └── logger.py           # Centralized structured logger
    └── types/
        ├── ai.py               # Pydantic models for grading, trees, OKF v0.2 graph nodes, misconceptions, and consolidation
        ├── schemas.py          # Pydantic models for chat payloads, messages, and student portfolios
        └── db.py               # Auto-generated database table representations
```

---

## 2. API Endpoints Specification

All backend endpoints are scoped under the `/api` prefix:

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    Client["Client / Edge Function / Webhook / Cron"]

    subgraph FastAPIRouter["FastAPI APIRouter (/api)"]
        HealthRoute["GET /api/health"]
        ChatRoute["POST /api/chat"]
        GradeRoute["POST /api/grade"]
        AnalyzeRoute["POST /api/materials/analyze"]
        TreeRoute["POST /api/materials/tree"]
        ConsolidateRoute["POST /api/consolidation/run"]
        MisconceptionsRoute["GET /api/misconceptions/proposed"]
        ReviewMisconceptionRoute["POST /api/misconceptions/{id}/review"]
    end

    Client --> HealthRoute
    Client --> ChatRoute
    Client --> GradeRoute
    Client --> AnalyzeRoute
    Client --> TreeRoute
    Client --> ConsolidateRoute
    Client --> MisconceptionsRoute
    Client --> ReviewMisconceptionRoute

    HealthRoute --> Status["{'status': 'ok'}"]
    ChatRoute --> ChatSvc["ChatService.process_chat_message()"]
    GradeRoute --> EvalSvcGrade["EvaluatorService.grade_submission()"]
    AnalyzeRoute --> EvalSvcMat["EvaluatorService.analyze_material()"]
    TreeRoute --> TreeSvc["TreeIndexerService.get_or_build_tree()"]
    ConsolidateRoute --> ConsolidateSvc["ConsolidationService.run_daily_consolidation()"]
    MisconceptionsRoute --> OntoSvcList["OntologyService.get_proposed_misconceptions()"]
    ReviewMisconceptionRoute --> OntoSvcRev["OntologyService.review_misconception()"]
```

### 2.1 Endpoint Contracts:

#### 1. `GET /api/health`
- **Purpose**: Liveness and readiness probe for Docker healthchecks and reverse proxy routing.
- **Response**: `{"status": "ok"}`

#### 2. `POST /api/chat`
- **Request Body**: `ChatPayload`
  - `messages`: Array of `Message` objects (`id`, `role`, `text`, `timestamp`).
  - `students`: Array of `StudentData` portfolios (scores, grades, submissions, attendance rates).
  - `classroom`: Classroom metadata (subject, grade level, teaching style, assessment preferences).
  - `newAnalysisConfig`: Active teacher directives (focus areas, tone, output preferences).
  - `class_id`: Optional UUID of classroom for pre-query answerability check.
  - `confirmed_soft_warning`: Boolean flag confirming user intent to proceed despite low coverage caveat.
- **Response**: `dict` containing `"text"` (markdown summary), optional `"visualization"` (JSON chart/ranking/heatmap/timeline model), or soft-warning caveat structure (`"is_answerable": false`, `"requires_confirmation": true`, `"caveat_message": "..."`).

#### 3. `POST /api/grade`
- **Request Body**: `GradeRequest`
  - `submission_id`: UUID of student submission.
  - `material_name`: Title of assignment material.
  - `submission_text`: Raw extracted text of student's submitted document.
  - `rubric_criteria`: List of rubric items (`name`, `maxScore`, `description`).
  - `max_score`: Total maximum score.
- **Response**: `GradeResponse`
  - `score`: Total score awarded.
  - `max_score`: Maximum possible score.
  - `grade`: Formatted letter grade and percentage (e.g., `"A (92%)"`).
  - `feedback`: Student-facing constructive commentary.
  - `private_teacher_notes`: Internal teacher diagnostics and detected misconceptions.
  - `rubric_breakdown`: Per-criterion score allocations and notes.
  - `rationale`: Analytical explanation of evaluation decision.
  - `status`: `"completed"` | `"failed"`.
  - `model_used`: LLM identifier (e.g. `"google/gemini-2.5-flash"`).

#### 4. `POST /api/materials/analyze`
- **Request Body**: `MaterialAnalyzeRequest`
  - `material_id`: UUID of material.
  - `name`: Material title.
  - `category`: `public.content_category` enum.
  - `extracted_text`: Full document textual content.
- **Response**: `MaterialAnalyzeResponse`
  - `summary`: Executive pedagogical overview.
  - `difficulty_level`: `"Beginner"` | `"Intermediate"` | `"Advanced"`.
  - `syllabus_alignment`: Array of curriculum topics, standard codes, and alignment confidence.
  - `prerequisite_gaps`: Array of detected prerequisite knowledge gaps and recommended remedial actions.
  - `sample_questions`: Array of synthesized practice questions with options, explanations, and answers.
  - `status`: `"completed"`.

#### 5. `POST /api/materials/tree`
- **Request Body**: `MaterialTreeRequest`
  - `material_id`: UUID of material.
  - `markdown_text`: Extracted markdown text of the document.
  - `force_reindex`: Boolean flag to force rebuilding the tree even if already present.
- **Response**: `MaterialTreeResponse`
  - `tree`: `MaterialTree` model containing `root_node` (hierarchical sections, summaries, concepts, token counts), `total_nodes`, and `max_depth`.
  - `indexed`: Boolean indicating whether a new tree index was constructed.
  - `reason`: `"indexed_successfully"` | `"already_indexed"` | `"below_threshold"`.

#### 6. `POST /api/consolidation/run`
- **Request Body**: `ConsolidationRequest` (optional)
  - `class_id`: Optional UUID to scope consolidation to a single class.
  - `force_full_audit`: Boolean flag to force a complete re-audit of the entire ontology graph.
- **Response**: `ConsolidationResponse`
  - `run_id`: UUID of the executed consolidation audit run in `ai.consolidation_runs`.
  - `status`: `"completed"` | `"failed"`.
  - `lint_report`: Structural summary of graph health (orphaned nodes removed, cycles resolved, invalid relationships flagged).
  - `proposed_misconceptions_count`: Number of newly synthesized pedagogical misconceptions surfaced for teacher review.

#### 7. `GET /api/misconceptions/proposed`
- **Query Parameters**:
  - `class_id`: Optional UUID filter for classroom-specific misconceptions.
- **Response**: `List[OntologyMisconception]`
  - Array of proposed misconception records (`id`, `class_id`, `concept_id`, `name`, `error_pattern`, `remediation_strategy`, `severity`, `confidence`, `evidence_submission_ids`, `surfaced_in_gradebook`).

#### 8. `POST /api/misconceptions/{misconception_id}/review`
- **Path Parameters**:
  - `misconception_id`: UUID of target misconception.
- **Request Body**: `MisconceptionReviewRequest`
  - `action`: `'confirm'` (promotes to `'confirmed'`) | `'dismiss'` (marks as `'dismissed'`).
  - `reviewer_id`: UUID of teacher performing review.
- **Response**: `dict` (`{"status": "ok", "action": "...", "misconception_id": "..."}`).

---

## 3. LLM Integration & Parser Subsystem (`src/lib/llm.py`)

The backend connects to external LLM providers via OpenRouter using LangChain's `ChatOpenAI`:

```python
def get_openrouter_llm(model: str, api_key: str, temperature: float = 0.2) -> ChatOpenAI:
    """Instantiate OpenRouter client with standardized base URL and timeout parameters."""
    return ChatOpenAI(
        model=model,
        openai_api_key=api_key,
        openai_api_base="https://openrouter.ai/api/v1",
        temperature=temperature,
        max_retries=3,
        request_timeout=60.0,
    )
```

### Resilient JSON Extraction:
LLM responses can occasionally wrap JSON in markdown blocks (` ```json ... ``` `) or include conversational preamble. The `parse_llm_response()` utility robustly isolates and parses JSON objects using regex delimiters and fallback cleaning routines.

---

## 4. Context Serialization Subsystem (`src/lib/formatter.py`)

To optimize prompt token density and maximize LLM comprehension:
- **`format_classroom_context()`**: Summarizes class subject, grade level, instructional rules, and teaching style.
- **`format_students_context()`**: Aggregates roster performance tiers, GPA distribution, attendance rates, and recent assignment grades into a compact tabular representation.
- **`format_analysis_config_context()`**: Injects active teacher preferences (e.g., focusing on at-risk students or prioritizing rubric alignment).

---

## 5. LangGraph State Persistence & Memory Architecture

For multi-turn agentic conversations and autonomous workflows, the backend connects to PostgreSQL checkpoint tables stored in the isolated `langgraph` schema:

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart LR
    LangGraphAgent["LangGraph Agent Node"]
    PostgresSaver["PostgresSaver / PostgresStore"]
    LGCheckpoints[("langgraph.checkpoints")]
    LGBlobs[("langgraph.checkpoint_blobs")]
    LGWrites[("langgraph.checkpoint_writes")]

    LangGraphAgent --> PostgresSaver
    PostgresSaver --> LGCheckpoints
    PostgresSaver --> LGBlobs
    PostgresSaver --> LGWrites
```

- **Isolated Schema**: Tables reside in `langgraph` schema (`langgraph.checkpoints`, `langgraph.checkpoint_blobs`, `langgraph.checkpoint_writes`, `langgraph.store`), preventing agent execution metadata from cluttering domain tables in `public`.
- **Time-Travel & Resumption**: Checkpoint states allow reconstructing previous conversation turns, resuming interrupted tool executions, and maintaining conversation memory across browser sessions.

---

## 6. Asynchronous PostgreSQL Connection Pool (`src/lib/db.py`)

To deliver sub-15ms database access without ORM overhead or connection thrashing, the backend maintains a centralized, high-concurrency connection pool managed via `psycopg_pool.AsyncConnectionPool`:

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart LR
    Lifespan["FastAPI Lifespan Context (main.py)"]
    PoolMgr["lib/db.py (AsyncConnectionPool)"]
    PostgresEngine[("PostgreSQL 15+ (Database)")]
    Services["Domain Services (TreeIndexer, Ontology, Evaluator, Chat)"]

    Lifespan -->|init_db_pool() at startup| PoolMgr
    Services -->|execute_query / fetch_all / fetch_one| PoolMgr
    PoolMgr -->|AsyncConnection (dict_row)| PostgresEngine
    Lifespan -->|close_db_pool() at shutdown| PoolMgr
```

### Key Invariants:
1. **Lifecycle Management**: Integrated directly into FastAPI's `@asynccontextmanager lifespan` in `src/main.py`. The pool opens gracefully upon application startup and cleanly terminates during process shutdown.
2. **Dictionary Row Factory**: Configured with `row_factory=dict_row`, returning database rows as native Python dictionaries for zero-copy JSON response serialization.
3. **Execution Helpers**:
   - `fetch_all(query, params)`: Returns list of record dictionaries.
   - `fetch_one(query, params)`: Returns single record dictionary or `None`.
   - `execute(query, params)`: Executes mutation statements (`INSERT`, `UPDATE`, `DELETE`) within an async connection context.
4. **Resilient Initialization**: If `DATABASE_URL` is omitted (e.g. in standalone unit testing), pool initialization logs a diagnostic warning and degrades gracefully without crashing the web service.

---

## 7. Knowledge Store & Ontological Services Architecture

The service layer implements the **Lean Dual-Engine Knowledge Architecture**, replacing dense vector embeddings with hierarchical structural trees and recursive SQL graphs:

### 7.1 Tree Indexer Service (`src/service/tree_indexer.py`)
- **Purpose**: Solves context fragmentation for long documents ($\ge 20$ pages or $\ge 15,000$ characters) such as textbooks, state curriculum standards, and multi-unit syllabi.
- **PageIndex Hierarchical Tree Construction**:
  - Recursively splits documents by heading levels (`#`, `##`, `###`).
  - Synthesizes section-level summaries, key pedagogical concepts, and token counts.
  - Persists JSONB tree representation to `ai.material_trees` with GIN indexing.
- **Top-Down Branch Navigation**: Traverses from document root $\to$ target unit $\to$ target section in $<15\text{ms}$, extracting only the relevant 300–500 token leaf passage with section breadcrumbs rather than dumping entire documents.

### 7.2 Ontology Service (`src/service/ontology.py`)
- **OKF v0.2 Knowledge Envelopes**: Manages pedagogical standards and concepts with metadata fields (`okf_type`, `status`, `verified_by`, `stale_after`, `tags`).
- **Closed Vocabulary Edges**: Validates relationships against `chk_relationship_type` (`prerequisite_of`, `subconcept_of`, `reinforces`, `remediates_misconception`, `assesses`, `supersedes`, `related_to`).
- **Recursive CTE Prerequisite Traversal**: Executes native PostgreSQL `WITH RECURSIVE` queries to resolve multi-hop prerequisite dependencies and learning gaps in $<10\text{ms}$.
- **Misconception Review Management**: Powers educator review flows for proposed pedagogical misconceptions (`confirm` or `dismiss`).

### 7.3 Consolidation Service (`src/service/consolidation.py`)
- **Daily Anti-Drift Audit**: Scheduled background maintenance pass identifying:
  - Orphaned concept nodes lacking parent linkages or material bindings.
  - Cyclic prerequisite dependencies ($A \to B \to A$) via recursive cycle detection.
  - Records detailed lint results into `ai.knowledge_lint_reports` and execution metrics into `ai.consolidation_runs`.
- **Autonomous Misconception Dreaming**: Synthesizes student errors across evaluated submissions to detect recurrent pedagogical pitfalls, inserting them into `ai.ontology_misconceptions` with `status = 'proposed'`.

### 7.4 Chat Service (`src/service/chat.py`)
- **Pre-Query Soft-Warning Gate**: Checks query concepts against classroom materials using `ai.check_answerable`. If coverage is low ($< 0.4$), returns a cooperative soft-warning caveat asking if the teacher wishes to proceed.
- **Dual-Engine Context Fusion**: Combines retrieved tree leaf citations and prerequisite chains within a deterministic ~4,300 prompt token budget.
- **Structured Interactive Visualizations**: Generates rich Markdown text coupled with structured interactive visualization payloads (`charts`, `heatmap`, `ranking`, `timeline`, `stats`) rendered by `Visualizer.tsx`.
