# Teach&Learn Subsystems Documentation

Welcome to the comprehensive subsystems documentation for **Teach&Learn**, an AI-powered full-stack workspace designed for educators to manage classes, track student portfolios, build repeatable curriculum templates, evaluate rubric criteria, and perform pedagogical gap analyses via LangGraph/RAG assistants.

---

## 🗺️ Subsystem Architecture Map

The Teach&Learn platform is architected as a set of decoupled, specialized subsystems cooperating across client-side UI, serverless edge computing, backend AI orchestration, and multi-tenant database layers:

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    %% Styling Classes
    classDef client fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0369a1;
    classDef edge fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#92400e;
    classDef backend fill:#f3e8ff,stroke:#9333ea,stroke-width:2px,color:#6b21a8;
    classDef data fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#15803d;
    classDef external fill:#f1f5f9,stroke:#64748b,stroke-width:2px,color:#334155;

    subgraph Tier1["1. Presentation Layer"]
        ClientApp["🖥️ Frontend Web Client<br/><b>React 18 / TypeScript / Vite / Tailwind</b><br/><i>(Classroom, Student Portfolios, AI Copilot)</i>"]:::client
    end

    subgraph Tier2["2. Compute & Microservice Layer"]
        EdgeFunctions["⚡ Serverless Edge Functions<br/><b>Supabase Edge Runtime (Deno)</b><br/><i>(OCR extraction, URL signing, invites, sync)</i>"]:::edge
        FastAPIService["🐍 Backend AI & Analytics Service<br/><b>FastAPI / Python 3.13 / Uvicorn</b><br/><i>(ChatService, EvaluatorService, LangGraph)</i>"]:::backend
    end

    subgraph Tier3["3. Persistence & Event Layer"]
        PostgresDB[("🗄️ PostgreSQL Database<br/><b>public, ai & langgraph schemas</b><br/><i>(Multi-tenant RLS, pgvector HNSW, triggers)</i>")]:::data
        StorageBuckets[("📦 Supabase Object Storage<br/><b>class-materials & student-submissions</b><br/><i>(Private buckets, 50MB limits)</i>")]:::data
        PgNetQueue["📡 pg_net Async Webhook Dispatcher"]:::data
    end

    subgraph Tier4["4. External Intelligence Gateway"]
        OpenRouterLLM["🤖 OpenRouter LLM Gateway<br/><b>Gemini 2.5 Flash / Claude 3.5 Sonnet</b>"]:::external
    end

    %% Client Traffic
    ClientApp -->|"PostgREST API + RLS"| PostgresDB
    ClientApp -->|"Direct Uploads & Signed Downloads"| StorageBuckets
    ClientApp -->|"REST Invocations (/api/chat, /api/health)"| FastAPIService
    ClientApp -->|"HTTP Edge Requests (URL signing, invites)"| EdgeFunctions

    %% Asynchronous Event Pipeline
    PostgresDB -->|"DB Triggers (Materials / Submissions)"| PgNetQueue
    PgNetQueue -.->|"Async Webhook POST"| EdgeFunctions
    EdgeFunctions -->|"Document Fetch & Text Parsing"| StorageBuckets
    EdgeFunctions -->|"Forward AI Workload (/api/grade, /api/analyze)"| FastAPIService
    EdgeFunctions -->|"Update State & Insights (Service Role)"| PostgresDB

    %% Backend & LLM Connections
    FastAPIService -->|"Vector Search & Checkpoints"| PostgresDB
    FastAPIService -->|"Inference Prompts & Structured JSON"| OpenRouterLLM
```

---

## 📚 Subsystems Index & Deep Dive Guides

Explore detailed subsystem specifications, data contracts, and architectural designs:

| Subsystem Document | Primary Technologies | Key Responsibilities |
| :--- | :--- | :--- |
| [**`database_and_storage.md`**](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/database_and_storage.md) | PostgreSQL 15+, Supabase RLS, Storage Buckets, `pg_trgm`, `pgcrypto` | Relational multi-tenancy, Row Level Security (RLS) policies, atomic RPC helper functions (`delete_material`, `unlink_material_from_class`, `delete_submission_atomic`), score recalculation triggers (`trg_sync_student_scores`), and reference-counted storage blob lifecycles. |
| [**`ai_and_ontology_subsystem.md`**](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/ai_and_ontology_subsystem.md) | `pgvector` (HNSW), LangChain Core, OpenRouter, Ontological Graph | Autonomous student submission grading (`/api/grade`), material syllabus analysis & prerequisite gap detection (`/api/materials/analyze`), interactive RAG chat with dynamic data visualizations (`/api/chat`), and pedagogical concept mastery tracking. |
| [**`backend_service.md`**](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/backend_service.md) | Python 3.13, FastAPI, Uvicorn, Pydantic v2, LangGraph, uv | REST API routing, structured LLM prompt formatting, JSON response parsing and validation, LangGraph state persistence, and BasedPyright-verified type safety. |
| [**`edge_functions.md`**](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/edge_functions.md) | Deno, TypeScript, Supabase Edge Runtime, PDF/Doc Parsers | Event-driven webhook processing (`trigger-submission-evaluation`, `trigger-material-analysis`), serverless document OCR text extraction, secure short-lived signed URL generation, and student invitation tokens. |
| [**`frontend_architecture.md`**](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/frontend_architecture.md) | React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons | Single-Page Application (SPA) architecture, custom state hooks (`useClassOperations`, `useWorkspaceData`, `useAIChat`), feature modularity (`classroom`, `students`, `ai-assistant`), and interactive rubric/diagnostic modals. |
| [**`devops_and_deployment.md`**](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/devops_and_deployment.md) | Docker, Docker Compose, Nginx Unprivileged, Vercel, Bash | Rootless container orchestration (`USER 1000:1000`), immutable production file permissions (`0555`/`0444`), unified single-container alternative host, database provisioning automation, and environment cascading. |
| [**`workflows/`**](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows/README.md) | Complete Full-Stack Workflows | Start-to-finish lifecycle guides for adding templates, creating classes from templates, uploading materials, student enrollment & attendance, submission turn-in & AI grading, and RAG copilot interactions. |
| [**`workflows-atomic/`**](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows-atomic/README.md) | Atomic Task Specifications | Granular, single-responsibility operational task specifications from trigger to conclusion, with event-driven AI pipelines treated as decoupled standalone workflows. |

---

## 🔄 End-to-End System Lifecycles

### 1. Student Submission & Autonomous AI Grading Flow
```mermaid
sequenceDiagram
    autonumber
    actor Student as Student
    actor Teacher as Teacher
    participant UI as React Frontend
    participant SB as Supabase Storage
    participant DB as PostgreSQL (public & ai)
    participant Edge as Edge Function (trigger-submission-evaluation)
    participant BE as Backend FastAPI (/api/grade)
    participant LLM as OpenRouter LLM

    Student->>UI: Uploads submission files & submits assignment
    UI->>SB: Stores blob in `student-submissions` bucket
    UI->>DB: Inserts row into `public.student_submissions` (status='Submitted')
    DB-->>DB: Executes `trg_sync_student_scores` trigger
    DB->>Edge: Database webhook triggered via pg_net
    Edge->>DB: Updates `ai.submission_evaluations` to status='processing'
    Edge->>BE: Invokes POST /api/grade (payload with extracted text & rubric)
    BE->>LLM: Evaluates work against rubric criteria
    LLM-->>BE: Returns structured evaluation JSON (scores, feedback, notes)
    BE->>DB: Persists rubric breakdown & notes in `ai.submission_evaluations`
    BE-->>Edge: Returns GradeResponse
    Edge->>DB: Updates `public.student_submissions` (status='Evaluated', score, feedback)
    DB-->>UI: Realtime update reflected in Gradebook Matrix
    Teacher->>UI: Reviews AI diagnostic diff, edits feedback, and publishes grade
```

### 2. Educational Material Upload & Pedagogical Gap Analysis Flow
```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Teacher
    participant UI as React Frontend
    participant SB as Supabase Storage
    participant DB as PostgreSQL (public & ai)
    participant Edge as Edge Function (trigger-material-analysis)
    participant BE as Backend FastAPI (/api/materials/analyze)
    participant LLM as OpenRouter LLM

    Teacher->>UI: Uploads lecture slides / syllabus note
    UI->>SB: Stores blob in `class-materials` bucket
    UI->>DB: Inserts row into `public.materials` & `public.class_materials`
    DB->>Edge: Database webhook triggered via pg_net
    Edge->>SB: Fetches document blob
    Edge->>Edge: Extracts raw textual content
    Edge->>DB: Records state in `ai.material_insights` (status='processing')
    Edge->>BE: Invokes POST /api/materials/analyze
    BE->>LLM: Analyzes topics, detects prerequisite gaps, generates sample Q&A
    LLM-->>BE: Returns structured MaterialAnalyzeResponse
    BE->>DB: Stores insights in `ai.material_insights` & maps ontology concepts
    BE-->>Edge: Returns completed analysis
    Edge->>DB: Updates status='completed'
    UI->>DB: Calls RPC `get_material_ai_insights`
    UI-->>Teacher: Displays syllabus alignment, prerequisite warnings, and practice questions
```

---

## 🛡️ Cross-Cutting System Invariants

1. **Strict Multi-Tenant Isolation**:
   - Every database query is guarded by PostgreSQL Row Level Security (RLS) using `auth.uid()`.
   - Teachers access only classes and materials they own or manage.
   - Students access only classes where they are actively enrolled.
2. **Immutable Containers & Principle of Least Privilege**:
   - Both frontend (Nginx) and backend (FastAPI/Uvicorn) execute as non-root user `1000:1000`.
   - Production container images enforce read-only source files (`0444`) and directories (`0555`).
3. **Strict Schema & Type Contracts**:
   - Schema single source of truth in PostgreSQL (`schema/schema-db.sql`, `schema/schema-ai.sql`).
   - Automated type synchronization via `scripts/_generate_types.py` producing strict TypeScript definitions (`frontend/src/types/db.ts`) and Pydantic models (`backend/src/types/db.py`).
4. **Resilient AI Processing**:
   - Robust fallback algorithms in `EvaluatorService` and `ChatService` ensuring structured JSON outputs even with varying LLM model outputs.
   - Non-blocking asynchronous processing for background AI tasks via database triggers and serverless Edge Functions.
