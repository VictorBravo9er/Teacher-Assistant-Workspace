# Didactiq Subsystems Documentation

Welcome to the comprehensive subsystems documentation for **Didactiq**, an AI-powered full-stack workspace designed for educators to manage classes, track student portfolios, build repeatable curriculum templates, evaluate rubric criteria, and perform pedagogical gap analyses via LangGraph/RAG assistants.

---

## 🗺️ Subsystem Architecture Map

The Didactiq platform is architected as a set of decoupled, specialized subsystems cooperating across client-side UI, serverless edge computing, backend AI orchestration, and multi-tenant database layers:

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
        ClientApp["🖥️ Frontend Web Client<br/><b>React 19 / TypeScript / Vite / Tailwind</b><br/><i>(Educator Workspace: ClassApp · Student Portal: StudentApp)</i>"]:::client
    end

    subgraph Tier2["2. Compute & Microservice Layer"]
        EdgeFunctions["⚡ Serverless Edge Functions<br/><b>Supabase Edge Runtime (Deno)</b><br/><i>(Text extraction, URL signing, invites, Resend email dispatches)</i>"]:::edge
        FastAPIService["🐍 Backend AI & Analytics Service<br/><b>FastAPI / Python 3.13 / Uvicorn</b><br/><i>(ChatService, EvaluatorService, TreeIndexer, Ontology, Consolidation)</i>"]:::backend
    end

    subgraph Tier3["3. Persistence & Event Layer"]
        PostgresDB[("🗄️ PostgreSQL Database<br/><b>public, ai & langgraph schemas</b><br/><i>(Multi-tenant RLS, Material Trees, OKF v0.2 Graph, Triggers)</i>")]:::data
        StorageBuckets[("📦 Supabase Object Storage<br/><b>class-materials & student-submissions</b><br/><i>(Private buckets, 50MB limits)</i>")]:::data
        PgNetQueue["📡 pg_net Async Webhook Dispatcher<br/><i>(AI triggers currently commented out)</i>"]:::data
    end

    subgraph Tier4["4. External Intelligence & Communication Gateway"]
        OpenRouterLLM["🤖 OpenRouter LLM Gateway<br/><b>Gemini 2.5 Flash / Claude 3.5 Sonnet</b>"]:::external
        ResendAPI["📧 Resend Email API<br/><b>Batch notifications & webhooks</b>"]:::external
    end

    %% Client Traffic
    ClientApp -->|"PostgREST API + RLS"| PostgresDB
    ClientApp -->|"Direct Uploads & Signed Downloads"| StorageBuckets
    ClientApp -->|"REST Invocations (/api/chat, /api/health)"| FastAPIService
    ClientApp -->|"HTTP Edge Requests (URL signing, invites, notify)"| EdgeFunctions

    %% Asynchronous Event Pipeline
    PostgresDB -.->|"DB Webhook Triggers (Currently Commented Out)"| PgNetQueue
    PgNetQueue -.->|"Async Webhook POST"| EdgeFunctions
    EdgeFunctions -->|"Document Fetch & Text Extraction"| StorageBuckets
    EdgeFunctions -->|"Forward AI Workload (/api/grade, /api/materials/analyze)"| FastAPIService
    EdgeFunctions -->|"Update Status & Logs (Service Role)"| PostgresDB
    EdgeFunctions -->|"Batch Email Dispatch (Announcements/Materials/Submissions)"| ResendAPI
    ResendAPI -.->|"Delivery Status Webhook (resend-webhook)"| EdgeFunctions

    %% Backend & LLM Connections
    FastAPIService -->|"Tree Indexing, Graph Traversal, Evaluations & Checkpoints"| PostgresDB
    FastAPIService -->|"Inference Prompts & Structured JSON"| OpenRouterLLM
```

---

## 📚 Subsystems Index & Deep Dive Guides

Explore detailed subsystem specifications, data contracts, and architectural designs:

| Subsystem Document | Primary Technologies | Key Responsibilities |
| :--- | :--- | :--- |
| [**`database_and_storage.md`**](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/systems/database_and_storage.md) | PostgreSQL 15+, Supabase RLS, Storage Buckets, `pg_trgm`, `pgcrypto` | Relational multi-tenancy, Row Level Security (RLS) policies, atomic RPC helper functions (`delete_material`, `unlink_material_from_class`, `delete_submission_atomic`), score recalculation triggers (`trg_sync_student_scores`), announcements and notification logs tracking. |
| [**`ai_and_ontology_subsystem.md`**](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/systems/ai_and_ontology_subsystem.md) | Dual-Engine Knowledge Store (PageIndex Trees & Relational OKF v0.2 Graph), LangChain Core, OpenRouter | Autonomous student submission grading (`/api/grade`), material syllabus analysis & prerequisite gap detection (`/api/materials/analyze`), PageIndex hierarchical tree indexing (`/api/materials/tree`), background integrity consolidation & Misconception Dreaming (`/api/consolidation/run`), proposed misconception review in Gradebook Matrix, and interactive RAG chat with soft-warning pre-query gate (`/api/chat`). |
| [**`backend_service.md`**](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/systems/backend_service.md) | Python 3.13, FastAPI, Uvicorn, Pydantic v2, LangGraph, uv | REST API routing, structured LLM prompt formatting, JSON response parsing and validation, LangGraph state persistence, and BasedPyright-verified type safety. |
| [**`edge_functions.md`**](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/systems/edge_functions.md) | Deno, TypeScript, Supabase Edge Runtime, Resend Batch API, UTF-8 Decoders | Event-driven webhook processing (`trigger-submission-evaluation`, `trigger-material-analysis`), serverless plaintext extraction (`extract-material-text`), secure short-lived signed URL generation, student invitation tokens, batch email notifications via Resend, and delivery tracking webhooks. |
| [**`frontend_architecture.md`**](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/systems/frontend_architecture.md) | React 19, Vite, TypeScript, Tailwind CSS, Lucide Icons | Single-Page Application (SPA) architecture, custom state hooks (`useClassOperations`, `useWorkspaceData`, `useAIChat`), feature modularity (`classroom`, `students`, `ai-assistant`, `calendar`), and interactive rubric/diagnostic modals. |
| [**`devops_and_deployment.md`**](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/systems/devops_and_deployment.md) | Docker, Docker Compose, Nginx, Vercel, Bash | Non-root container orchestration (`b-usr`/`node` UID 1000), read-only production asset permissions (`0555`/`0444`), multi-service serverless hosting, database provisioning automation, and environment cascading. |
| [**`workflows/`**](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/systems/workflows/README.md) | Operational Workflows | End-to-end user journeys, sequence diagrams, and lifecycle specifications for templates, materials, student enrollment & attendance, submission turn-in & AI grading, announcements & notifications, student portal, and RAG copilot interactions. |

---

## 🔄 End-to-End System Lifecycles

### 1. Student Submission & Autonomous AI Grading Flow
*(Note: Database webhook trigger `trg_submission_ai_eval` in `20260915120100_ai_functions_and_triggers.sql` and live UI integration in `SubmissionGradingModal.tsx` are currently decoupled/pending activation.)*
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
    DB-.->Edge: Planned pg_net webhook trigger (`trg_submission_ai_eval` commented out)
    Edge->>DB: Upserts `ai.submission_evaluations` to status='processing'
    Edge->>BE: Invokes POST /api/grade (payload with extracted text & rubric)
    BE->>LLM: Evaluates work against rubric criteria
    LLM-->>BE: Returns structured evaluation JSON (scores, feedback, notes)
    BE->>DB: Persists rubric breakdown, mastery & proposed misconceptions in `ai` schema
    BE-->>Edge: Returns GradeResponse
    Teacher->>UI: Reviews diagnostic diff, adjusts feedback, and saves grade in `public.student_submissions`
```

### 2. Educational Material Upload & Pedagogical Gap Analysis Flow
*(Note: Database webhook triggers `trg_material_ai_analysis` / `trg_class_material_ai_analysis` and UI `get_material_ai_insights` panel in `MaterialPreviewModal.tsx` are currently decoupled/pending wiring.)*
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
    DB-.->Edge: Planned pg_net webhook trigger (`trg_material_ai_analysis` commented out)
    Edge->>SB: Fetches document blob
    Edge->>Edge: Extracts raw UTF-8 textual content
    Edge->>DB: Records state in `ai.material_insights` (status='processing')
    Edge->>BE: Invokes POST /api/materials/analyze
    BE->>LLM: Analyzes topics, detects prerequisite gaps, generates sample Q&A
    LLM-->>BE: Returns structured MaterialAnalyzeResponse
    BE->>DB: Stores insights in `ai.material_insights`, maps ontology concepts & builds `ai.material_trees`
    BE-->>Edge: Returns completed analysis
    UI-.->DB: Planned RPC `get_material_ai_insights` display in MaterialPreviewModal
```

### 3. Class Announcement Broadcast & Email Notification Delivery Flow
```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Teacher
    participant UI as React Frontend
    participant DB as PostgreSQL (public)
    participant EdgeAnn as Edge Function (notify-announcement)
    participant Resend as Resend Email Gateway
    participant EdgeWebhook as Edge Function (resend-webhook)
    actor Student as Student / Parent

    Teacher->>UI: Posts announcement with "Notify Parents & Students" checked
    UI->>DB: Inserts into `public.announcements`
    UI->>EdgeAnn: Invokes POST /functions/v1/notify-announcement
    EdgeAnn->>DB: Resolves enrolled students & parent contacts in `class_students`
    EdgeAnn->>Resend: Dispatches batch emails (POST /emails/batch)
    Resend-->>EdgeAnn: Returns batch response with email IDs
    EdgeAnn->>DB: Inserts rows into `public.notification_logs` (status='queued')
    EdgeAnn-->>UI: Confirms queued notifications
    Resend->>Student: Delivers email notification
    Resend->>EdgeWebhook: Sends MTA webhook (type='email.delivered' / 'email.bounced')
    EdgeWebhook->>DB: Updates `public.notification_logs` (status='delivered' / 'bounced')
    alt If Bounced
        EdgeWebhook->>Resend: Dispatches failure notice to Teacher
        Resend->>Teacher: Notifies teacher of invalid student/parent email
    end
```

### 4. Student Self-Service & Assignment Turn-In Flow
```mermaid
sequenceDiagram
    autonumber
    actor Student as Student
    participant Portal as Student Portal (StudentApp)
    participant Svc as studentPortalService
    participant Storage as Supabase Storage (student-submissions)
    participant DB as PostgreSQL (public)
    participant Edge as Edge Function (notify-submission)
    actor Teacher as Teacher

    Student->>Portal: Navigates assignments & opens StudentTurnInModal
    Student->>Portal: Selects File, URL, or writes Text response
    alt File Upload
        Portal->>Storage: Uploads work to `student-submissions/{material_id}/{content_id}`
    end
    Portal->>Svc: Calls submitAssignment(submissionPayload)
    Svc->>DB: Upserts row in `public.student_submissions` (status='Submitted')
    Portal-->>Student: 0ms optimistic status update ("Submitted" badge)
    Svc->>Edge: Invokes POST /functions/v1/notify-submission
    Edge->>Teacher: Sends submission alert email with student reply_to
```

### 5. Curriculum Template to Class Instantiation Flow
```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Teacher
    participant UI as React UI (CreateClassModal)
    participant Svc as templateService / classService
    participant DB as PostgreSQL (public)

    Teacher->>UI: Selects template blueprint & customizes term/dates
    UI->>Svc: Calls createClassFromTemplate(templateId, classOverrides)
    Svc->>DB: Inserts new course row in `public.classes`
    Svc->>DB: Copies `template_materials` into `public.class_materials`
    Svc->>DB: Copies `template_instructions` into `public.class_instructions`
    DB-->>UI: Returns newly created class instance
    UI-->>Teacher: Navigates directly into active class workspace
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
   - Schema single source of truth in PostgreSQL migrations (`supabase/migrations/`).
   - Automated type synchronization via `scripts/_generate_types.py` producing strict TypeScript definitions (`frontend/src/types/db.ts`) and Pydantic models (`backend/src/types/db.py`).
4. **Resilient AI Processing**:
   - Robust fallback algorithms in `EvaluatorService` and `ChatService` ensuring structured JSON outputs even with varying LLM model outputs.
   - Non-blocking asynchronous processing for background AI tasks via database triggers and serverless Edge Functions.
